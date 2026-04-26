import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../../mail/mail.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastPasswordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }

  async updateMyAddress(
    userId: string,
    dto: { address?: string | null },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const nextAddress =
      dto.address !== undefined ? dto.address?.trim() || null : user.address;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        address: nextAddress,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        lastPasswordChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
async verifyMyPassword(
  userId: string,
  dto: { currentPassword: string },
) {
  const currentPassword = dto.currentPassword?.trim();

  if (!currentPassword) {
    throw new BadRequestException("Current password is required.");
  }

  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException("User not found.");
  }

  const passwordMatched = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordMatched) {
    throw new UnauthorizedException("Current password is incorrect.");
  }

  return { message: "Password verified successfully." };
}
 async changeMyPassword(
  userId: string,
  dto: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
) {
    const currentPassword = dto.currentPassword?.trim();
    const newPassword = dto.newPassword?.trim();
    const confirmPassword = dto.confirmPassword?.trim();
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new BadRequestException("All password fields are required.");
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException("New password and confirm password do not match.");
    }

    if (newPassword.length < 8) {
      throw new BadRequestException("New password must be at least 8 characters long.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const passwordMatched = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException("Current password is incorrect.");
    }

    const sameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
    if (sameAsOld) {
      throw new BadRequestException(
        "New password must be different from the current password.",
      );
    }

    if (user.lastPasswordChangedAt) {
  const lastChangedAt = new Date(user.lastPasswordChangedAt);
const nextAllowedDate = new Date(lastChangedAt);
nextAllowedDate.setHours(nextAllowedDate.getHours() + 24);

  const now = new Date();

  if (now < nextAllowedDate) {
    const formattedNextDate = nextAllowedDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    throw new BadRequestException(
      `You can change your password again on ${formattedNextDate}.`,
    );
  }
}

    const passwordHash = await bcrypt.hash(newPassword, 10);

await this.prisma.user.update({
  where: { id: userId },
  data: {
    passwordHash,
    lastPasswordChangedAt: new Date(),
  },
});

await this.prisma.userSession.updateMany({
  where: {
    userId,
    isActive: true,
  },
  data: {
    isActive: false,
  },
});
// Email disabled for privacy (no password will be sent via email)

    return {
      message: "Password updated successfully.",
    };
  }

  async findAll(search?: string, status?: string) {
    const items = await this.prisma.user.findMany({
      where: {
        role: UserRole.USER,
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: "insensitive" } },
                { email: { contains: search.trim(), mode: "insensitive" } },
                { phone: { contains: search.trim(), mode: "insensitive" } },
                { gstin: { contains: search.trim(), mode: "insensitive" } },
                { pan: { contains: search.trim(), mode: "insensitive" } },
                { address: { contains: search.trim(), mode: "insensitive" } },
              ],
            }
          : {}),
        ...(status === "active"
          ? { isActive: true }
          : status === "inactive"
            ? { isActive: false }
            : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastCredentialSentAt: true,
      },
    });

    return {
      items,
      total: items.length,
    };
  }

  async create(dto: CreateUserDto) {
    if (!dto.gstin && !dto.pan) {
      throw new BadRequestException("Either GSTIN or PAN is required.");
    }

    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone?.trim() || null;
    const gstin = dto.gstin?.trim().toUpperCase() || null;
    const pan = dto.pan?.trim().toUpperCase() || null;
    const address = dto.address?.trim() || null;

    const existingEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException("Email already exists.");
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new ConflictException("Phone already exists.");
      }
    }

    const generatedPassword = this.generateTemporaryPassword(8);
    const passwordHash = await bcrypt.hash(generatedPassword, 10);
    const now = dto.sendCredentials ? new Date() : null;

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        phone,
        passwordHash,
        gstin,
        pan,
        address,
        role: UserRole.USER,
        isActive: true,
        lastCredentialSentAt: now,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastCredentialSentAt: true,
      },
    });

    if (dto.sendCredentials) {
      await this.mailService.sendWelcomeCredentialsEmail({
        to: email,
        name: dto.name.trim(),
        email,
        phone: phone || "",
        password: generatedPassword,
      });
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.role !== UserRole.USER) {
      throw new NotFoundException("User not found.");
    }

    const nextEmail =
      dto.email !== undefined ? dto.email.trim().toLowerCase() : existing.email;

    const nextPhone =
      dto.phone !== undefined ? dto.phone.trim() || null : existing.phone;

    const nextGstin =
      dto.gstin !== undefined
        ? dto.gstin.trim().toUpperCase() || null
        : existing.gstin;

    const nextPan =
      dto.pan !== undefined
        ? dto.pan.trim().toUpperCase() || null
        : existing.pan;

    const nextAddress =
      dto.address !== undefined ? dto.address.trim() || null : existing.address;

    if (!nextGstin && !nextPan) {
      throw new BadRequestException("Either GSTIN or PAN is required.");
    }

    if (dto.email !== undefined && nextEmail !== existing.email) {
      const duplicateEmail = await this.prisma.user.findUnique({
        where: { email: nextEmail },
      });

      if (duplicateEmail) {
        throw new ConflictException("Email already exists.");
      }
    }

    if (dto.phone !== undefined && nextPhone && nextPhone !== existing.phone) {
      const duplicatePhone = await this.prisma.user.findUnique({
        where: { phone: nextPhone },
      });

      if (duplicatePhone) {
        throw new ConflictException("Phone already exists.");
      }
    }

    const data: {
      name?: string;
      email?: string;
      phone?: string | null;
      gstin?: string | null;
      pan?: string | null;
      address?: string | null;
      passwordHash?: string;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = nextEmail;
    if (dto.phone !== undefined) data.phone = nextPhone;
    if (dto.gstin !== undefined) data.gstin = nextGstin;
    if (dto.pan !== undefined) data.pan = nextPan;
    if (dto.address !== undefined) data.address = nextAddress;

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastCredentialSentAt: true,
      },
    });
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.role !== UserRole.USER) {
      throw new NotFoundException("User not found.");
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        pan: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastCredentialSentAt: true,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existing || existing.role !== UserRole.USER) {
      throw new NotFoundException("User not found.");
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully." };
  }

  async sendCredentials(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.role !== UserRole.USER) {
      throw new NotFoundException("User not found.");
    }

    if (!user.email) {
      throw new BadRequestException("User email is missing.");
    }

    const email = user.email;
    const tempPassword = this.generateTemporaryPassword(8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        lastCredentialSentAt: new Date(),
      },
    });

    await this.mailService.sendWelcomeCredentialsEmail({
      to: email,
      name: user.name,
      email,
      phone: user.phone || "",
      password: tempPassword,
    });

    return { message: "Credentials sent successfully." };
  }

  private generateTemporaryPassword(length = 8) {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#%";
    const allChars = uppercase + lowercase + numbers + symbols;

    const pick = (chars: string) =>
      chars.charAt(Math.floor(Math.random() * chars.length));

    const passwordChars = [
      pick(uppercase),
      pick(lowercase),
      pick(numbers),
      pick(symbols),
    ];

    for (let i = passwordChars.length; i < length; i++) {
      passwordChars.push(pick(allChars));
    }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join("").slice(0, length);
  }
}