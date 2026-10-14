import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (!roles.length) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string; email?: string } }>();
    const breakGlass = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (request.user?.role && roles.includes(request.user.role)) return true;
    if (
      request.user?.email &&
      breakGlass.includes(request.user.email.toLowerCase())
    )
      return true;
    throw new ForbiddenException("Insufficient permissions");
  }
}
