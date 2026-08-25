import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/dashboard',
  cors: { origin: true, credentials: true },
})
export class DashboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    const token = client.handshake.headers.cookie
      ?.split(';')
      .map((cookie) => cookie.trim().split('='))
      .find(([name]) => name === 'accessToken')?.[1];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'access-secret',
      });
    } catch {
      client.disconnect();
    }
  }

  emitReadingEvent(payload: unknown) {
    this.server.emit('reading:event', payload);
  }

  emitSessionUpdated(payload: unknown) {
    this.server.emit('reading:session-updated', payload);
  }
}
