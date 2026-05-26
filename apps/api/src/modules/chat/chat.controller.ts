import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @RequirePermissions('chat.read')
  @Get('workspace')
  getWorkspace(@CurrentUser('id') userId: string) {
    return this.chatService.getWorkspace(userId);
  }

  @RequirePermissions('chat.read')
  @Get('rooms')
  getRooms(@CurrentUser('id') userId: string) {
    return this.chatService.getRooms(userId);
  }

  @RequirePermissions('chat.read')
  @Get('members')
  listMembers(@CurrentUser('id') userId: string) {
    return this.chatService.listMembers(userId);
  }

  @RequirePermissions('chat.use')
  @Post('rooms/direct')
  getDirectRoom(@CurrentUser('id') userId: string, @Body() body: { userId: string }) {
    return this.chatService.getOrCreateDirectRoom(userId, body.userId);
  }

  @RequirePermissions('chat.read')
  @Get('rooms/:roomId/messages')
  getMessages(@Param('roomId') roomId: string, @CurrentUser('id') userId: string) {
    return this.chatService.getMessages(roomId, userId);
  }

  @RequirePermissions('chat.use')
  @Post('rooms/:roomId/messages')
  sendMessage(
    @Param('roomId') roomId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { content: string },
  ) {
    return this.chatService.sendMessage(roomId, userId, body.content);
  }
}
