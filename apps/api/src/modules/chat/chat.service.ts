import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const TEAM_ROOM_ID = '00000000-0000-0000-0000-0000000000chat';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  private async assertParticipant(roomId: string, userId: string) {
    const p = await this.prisma.chatParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!p) throw new ForbiddenException('Not a member of this chat room');
  }

  async ensureTeamRoom(userId: string) {
    let room = await this.prisma.chatRoom.findUnique({ where: { id: TEAM_ROOM_ID } });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: {
          id: TEAM_ROOM_ID,
          name: 'VegaCore Team',
          isGroup: true,
        },
      });
    }

    await this.prisma.chatParticipant.upsert({
      where: { roomId_userId: { roomId: TEAM_ROOM_ID, userId } },
      create: { roomId: TEAM_ROOM_ID, userId },
      update: {},
    });

    return room;
  }

  async getWorkspace(userId: string) {
    await this.ensureTeamRoom(userId);

    const [rooms, members] = await Promise.all([
      this.getRooms(userId),
      this.listMembers(userId),
    ]);

    return { rooms, members, teamRoomId: TEAM_ROOM_ID };
  }

  listMembers(userId: string) {
    return this.prisma.user.findMany({
      where: { id: { not: userId }, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: { select: { name: true, slug: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 100,
    });
  }

  async getRooms(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true, role: { select: { name: true } } } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return rooms
      .map((room) => ({
        ...room,
        lastMessage: room.messages[0] || null,
        messages: undefined,
      }))
      .sort((a, b) => {
        const ta = a.lastMessage?.createdAt?.getTime() ?? a.createdAt.getTime();
        const tb = b.lastMessage?.createdAt?.getTime() ?? b.createdAt.getTime();
        return tb - ta;
      });
  }

  async getOrCreateDirectRoom(userId: string, otherUserId: string) {
    if (userId === otherUserId) {
      throw new ForbiddenException('Cannot open a chat with yourself');
    }

    const other = await this.prisma.user.findUnique({ where: { id: otherUserId } });
    if (!other) throw new NotFoundException('User not found');

    const candidates = await this.prisma.chatRoom.findMany({
      where: { isGroup: false, participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      },
    });

    const existing = candidates.find(
      (r) =>
        r.participants.length === 2 &&
        r.participants.every((p) => [userId, otherUserId].includes(p.userId)),
    );
    if (existing) return existing;

    return this.prisma.chatRoom.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      },
    });
  }

  async getMessages(roomId: string, userId: string, limit = 80) {
    await this.assertParticipant(roomId, userId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
    return messages;
  }

  async sendMessage(roomId: string, senderId: string, content: string) {
    const text = content?.trim();
    if (!text) throw new ForbiddenException('Message cannot be empty');

    await this.assertParticipant(roomId, senderId);

    return this.prisma.chatMessage.create({
      data: { roomId, senderId, content: text },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    });
  }

  displayRoomTitle(room: { id: string; name?: string | null; isGroup: boolean; participants: { user: { id: string; firstName: string; lastName: string } }[] }, currentUserId: string) {
    if (room.isGroup && room.name) return room.name;
    const other = room.participants.find((p) => p.user.id !== currentUserId)?.user;
    return other ? `${other.firstName} ${other.lastName}` : room.name || 'Chat';
  }
}
