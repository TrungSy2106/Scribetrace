import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReadingEventType, SessionState } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardGateway } from '../dashboard/dashboard.gateway';
import { CreateEventBatchDto } from './dto/create-event-batch.dto';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardGateway: DashboardGateway,
  ) {}

  async create(data: CreateEventDto) {
    const result = await this.prisma.$transaction((tx) =>
      this.processEvent(tx, data),
    );

    if (!result.duplicate) {
      this.emit(result);
    }

    return this.serialize(result);
  }

  async createBatch(data: CreateEventBatchDto) {
    const events = [...data.events].sort(
      (a, b) =>
        a.sessionId.localeCompare(b.sessionId) || a.clientSeq - b.clientSeq,
    );
    let processed = 0;
    let duplicates = 0;
    const failures: { eventId: string; reason: string }[] = [];

    for (const event of events) {
      try {
        const result = await this.prisma.$transaction((tx) =>
          this.processEvent(tx, event),
        );
        if (result.duplicate) {
          duplicates += 1;
        } else {
          processed += 1;
          this.emit(result);
        }
      } catch (error) {
        failures.push({
          eventId: event.eventId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      processed,
      duplicates,
      failed: failures.length,
      failures,
    };
  }

  private async processEvent(
    tx: Prisma.TransactionClient,
    data: CreateEventDto,
  ) {
    const duplicate = await tx.readingEvent.findUnique({
      where: { id: data.eventId },
    });

    if (duplicate) {
      const session = await tx.readingSession.findUnique({
        where: { id: duplicate.sessionId },
        include: { article: { include: { website: true } } },
      });
      return { duplicate: true, event: duplicate, session };
    }

    const occurredAt = new Date(data.occurredAt);
    let session = await tx.readingSession.findUnique({
      where: { id: data.sessionId },
      include: { article: { include: { website: true } } },
    });

    if (data.eventType === ReadingEventType.PAGE_ENTER) {
      if (!data.page) {
        throw new BadRequestException('Page is required for PAGE_ENTER');
      }

      const hostname = new URL(data.page.url).hostname
        .toLowerCase()
        .replace(/^www\./, '');
      const website = await tx.website.findFirst({
        where: {
          isEnabled: true,
          domain: hostname,
        },
      });

      if (!website) {
        throw new BadRequestException('Website is not tracked');
      }

      const extractionWarning =
        data.page.title.trim().length < 5 ||
        data.page.content.trim().length < 100;
      const warningChanged = await tx.website.updateMany({
        where: {
          id: website.id,
          extractionWarning: !extractionWarning,
        },
        data: {
          extractionWarning,
        },
      });

      if (extractionWarning && warningChanged.count) {
        await tx.notification.create({
          data: {
            message:
              `Extraction may be incomplete for ${website.domain}. ` +
              `Title: ${data.page.title.trim().length}, ` +
              `content: ${data.page.content.trim().length}.`,
          },
        });
      }

      const normalizedUrl = this.normalizeUrl(data.page.url);
      const articleKey = {
        websiteId: website.id,
        normalizedUrl,
      };
      const existingArticle = await tx.article.findUnique({
        where: {
          websiteId_normalizedUrl: articleKey,
        },
        select: {
          title: true,
          content: true,
        },
      });
      const incomingTitle = data.page.title.trim();
      const incomingContent = data.page.content.trim();
      const shouldUpdateTitle =
        existingArticle !== null &&
        existingArticle.title.trim().length < 5 &&
        incomingTitle.length >= 5;
      const shouldUpdateContent =
        existingArticle !== null &&
        incomingContent.length >= 100 &&
        (existingArticle.content.trim().length < 100 ||
          (!existingArticle.content.includes('\n') &&
            incomingContent.includes('\n')));
      const article = await tx.article.upsert({
        where: {
          websiteId_normalizedUrl: articleKey,
        },
        create: {
          websiteId: website.id,
          url: data.page.url,
          normalizedUrl,
          title: data.page.title,
          content: data.page.content,
        },
        update: {
          lastSeenAt: occurredAt,
          ...(shouldUpdateTitle && { title: data.page.title }),
          ...(shouldUpdateContent && { content: data.page.content }),
        },
      });

      if (!session) {
        session = await tx.readingSession.create({
          data: {
            id: data.sessionId,
            articleId: article.id,
            browserTabId: data.browser?.tabId,
            browserWindowId: data.browser?.windowId,
            startedAt: occurredAt,
            currentState: SessionState.ACTIVE,
            lastEventAt: occurredAt,
          },
          include: { article: { include: { website: true } } },
        });
      }
    }

    if (!session) {
      throw new NotFoundException('Reading session not found');
    }

    const previousAt = session.lastEventAt || session.startedAt;
    const elapsed = Math.max(0, occurredAt.getTime() - previousAt.getTime());
    let activeReadingMs = session.activeReadingMs;
    let inactiveMs = session.inactiveMs;
    let currentState = session.currentState;
    let endedAt = session.endedAt;
    let endReason = session.endReason;

    if (data.eventType === ReadingEventType.PAGE_ACTIVE) {
      if (currentState === SessionState.INACTIVE) {
        inactiveMs += BigInt(elapsed);
      }
      currentState = SessionState.ACTIVE;
    }

    if (data.eventType === ReadingEventType.PAGE_INACTIVE) {
      if (currentState === SessionState.ACTIVE) {
        activeReadingMs += BigInt(elapsed);
      }
      currentState = SessionState.INACTIVE;
    }

    if (data.eventType === ReadingEventType.PAGE_LEAVE) {
      if (currentState === SessionState.ACTIVE) {
        activeReadingMs += BigInt(elapsed);
      } else if (currentState === SessionState.INACTIVE) {
        inactiveMs += BigInt(elapsed);
      }
      currentState = SessionState.ENDED;
      endedAt = occurredAt;
      endReason = 'PAGE_LEAVE';
    }

    session = await tx.readingSession.update({
      where: { id: session.id },
      data: {
        activeReadingMs,
        inactiveMs,
        currentState,
        endedAt,
        endReason,
        lastEventAt: occurredAt,
      },
      include: { article: { include: { website: true } } },
    });

    const event = await tx.readingEvent.create({
      data: {
        id: data.eventId,
        sessionId: data.sessionId,
        eventType: data.eventType,
         clientSeq: data.clientSeq,
         occurredAt,
         metadata: {
          url: data.url,
          title: data.title,
          ...(data.page && {
            page: {
              url: data.page.url,
              domain: data.page.domain,
              title: data.page.title,
              content: data.page.content,
            },
          }),
          ...(data.browser && {
            browser: {
              tabId: data.browser.tabId,
              windowId: data.browser.windowId,
            },
          }),
        },
      },
    });

    return { duplicate: false, event, session };
  }

  private emit(result: any) {
    const { event, session } = result;
    this.dashboardGateway.emitReadingEvent({
      eventId: event.id,
      sessionId: event.sessionId,
      eventType: event.eventType,
      occurredAt: event.occurredAt,
      article: {
        id: session.article.id,
        title: session.article.title,
        domain: session.article.website.domain,
      },
    });
    this.dashboardGateway.emitSessionUpdated({
      sessionId: session.id,
      state: session.currentState,
      activeReadingMs: Number(session.activeReadingMs),
      inactiveMs: Number(session.inactiveMs),
      lastEventAt: session.lastEventAt,
    });
  }

  private serialize(result: any) {
    return {
      duplicate: result.duplicate,
      eventId: result.event.id,
      sessionId: result.event.sessionId,
      state: result.session?.currentState,
      activeReadingMs: result.session
        ? Number(result.session.activeReadingMs)
        : undefined,
      inactiveMs: result.session ? Number(result.session.inactiveMs) : undefined,
    };
  }

  private normalizeUrl(value: string) {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  }
}
