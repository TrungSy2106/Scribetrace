export type EventType = "PAGE_ENTER" | "PAGE_ACTIVE" | "PAGE_INACTIVE" | "PAGE_LEAVE";
export type SessionState = "ACTIVE" | "INACTIVE" | "ENDED" | "STALE";

export interface Website {
  id: string;
  name: string;
  domain: string;
  titleSelector: string | null;
  contentSelector: string | null;
  extractionWarning: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ArticleListItem {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  website: Pick<Website, "id" | "name" | "domain">;
  totalReadingMs: number;
  sessionCount: number;
  latestReadingAt: string | null;
  isActive: boolean;
}

export interface ReadingEvent {
  id: string;
  sessionId: string;
  eventType: EventType;
  clientSeq: number;
  occurredAt: string;
}

export interface ArticleSession {
  id: string;
  articleId: string;
  startedAt: string;
  endedAt: string | null;
  currentState: SessionState;
  activeReadingMs: number;
  inactiveMs: number;
  events: ReadingEvent[];
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  sessions: ArticleSession[];
}

export interface Session {
  id: string;
  articleId: string;
  startedAt: string;
  endedAt: string | null;
  currentState: SessionState;
  activeReadingMs: number;
  inactiveMs: number;
  lastEventAt: string | null;
  article: {
    id: string;
    title: string;
    url: string;
    website: Pick<Website, "name" | "domain">;
  };
  events?: ReadingEvent[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardOverview {
  totalArticles: number;
  totalReadingMs: number;
  averageReadingMs: number;
  activeSessions: number;
}

export interface ReadingTrend {
  date: string;
  totalReadingMs: number;
}

export interface ReadingByWebsite {
  websiteId: string;
  name: string;
  domain: string;
  totalReadingMs: number;
}

export interface LiveReadingEvent {
  eventId: string;
  sessionId: string;
  eventType: EventType;
  occurredAt: string;
  article: {
    id: string;
    title: string;
    domain: string;
  };
}
