import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest(err, user, info, context: ExecutionContext) {
    // ❌ no token / invalid token / expired
    if (err || !user) {
      throw new UnauthorizedException("Unauthorized access");
    }

    return user;
  }
}