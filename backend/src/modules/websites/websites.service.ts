import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { UpdateWebsiteDto } from './dto/update-website.dto';

@Injectable()
export class WebsitesService {
  constructor(private readonly prisma: PrismaService) {}

  findTracked() {
    return this.prisma.website.findMany({
      where: { isEnabled: true },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        domain: true,
        titleSelector: true,
        contentSelector: true,
      },
    });
  }

  findAll() {
    return this.prisma.website.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: CreateWebsiteDto) {
    const domain = this.normalizeDomain(data.domain);
    const existing = await this.prisma.website.findUnique({ where: { domain } });

    if (existing) {
      throw new ConflictException('Website domain already exists');
    }

    return this.prisma.website.create({
      data: {
        name: data.name,
        domain,
        titleSelector: data.titleSelector?.trim() || null,
        contentSelector: data.contentSelector?.trim() || null,
      },
    });
  }

  async update(id: string, data: UpdateWebsiteDto) {
    const website = await this.prisma.website.findUnique({ where: { id } });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    const domain = data.domain ? this.normalizeDomain(data.domain) : undefined;

    if (domain && domain !== website.domain) {
      const existing = await this.prisma.website.findUnique({ where: { domain } });
      if (existing) {
        throw new ConflictException('Website domain already exists');
      }
    }

    return this.prisma.website.update({
      where: { id },
      data: {
        ...data,
        domain,
        titleSelector:
          data.titleSelector === undefined
            ? undefined
            : data.titleSelector?.trim() || null,
        contentSelector:
          data.contentSelector === undefined
            ? undefined
            : data.contentSelector?.trim() || null,
      },
    });
  }

  private normalizeDomain(domain: string) {
    return domain.trim().toLowerCase().replace(/^www\./, '');
  }
}
