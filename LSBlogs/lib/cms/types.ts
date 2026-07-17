export type ContentType = "post" | "chatter" | "moment" | "about";

export type OperationType =
  | "publish_article"
  | "sync_photowall"
  | "sync_friends"
  | "sync_projects"
  | "CONFIG"
  | "create_moment";

export type CmsOperation = {
  id: string;
  type: OperationType;
  label: string;
  description?: string;
  timestamp: string;
  payload: unknown;
};

export type CmsDraft = {
  id?: string | null;
  type: ContentType;
  title?: string;
  tags?: string[];
  cover?: string;
  mood?: string;
  description?: string;
  content?: string;
  date?: string;
  published?: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};

export type PendingChange = {
  path: string;
  content: string | null;
};

export type ProviderName = "vercel" | "lsky" | "tencent" | "aliyun" | "github";

export type PicBedConfig = {
  provider: ProviderName;
  pathPrefix: string;
  lsky: { url: string; token: string };
  tencent: {
    secretId: string;
    secretKey: string;
    region: string;
    bucket: string;
    domain: string;
  };
  aliyun: {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
    bucket: string;
    domain: string;
  };
  github: {
    token: string;
    owner: string;
    repo: string;
    branch: string;
    domain: string;
  };
};

export type ReleaseRecord = {
  createdAt: string;
  branch: string;
  pullNumber: number;
  pullUrl: string;
  files: string[];
};

export type CmsState = {
  version: 1;
  drafts: Record<string, CmsDraft>;
  operations: CmsOperation[];
  pendingChanges: Record<string, PendingChange>;
  picbed: PicBedConfig;
  lastRelease?: ReleaseRecord;
};

export const DEFAULT_PICBED_CONFIG: PicBedConfig = {
  provider: "vercel",
  pathPrefix: "uploads",
  lsky: { url: "", token: "" },
  tencent: {
    secretId: "",
    secretKey: "",
    region: "ap-guangzhou",
    bucket: "",
    domain: "",
  },
  aliyun: {
    accessKeyId: "",
    accessKeySecret: "",
    endpoint: "oss-cn-hangzhou.aliyuncs.com",
    bucket: "",
    domain: "",
  },
  github: {
    token: "",
    owner: "",
    repo: "",
    branch: "main",
    domain: "",
  },
};

export function createEmptyCmsState(): CmsState {
  return {
    version: 1,
    drafts: {},
    operations: [],
    pendingChanges: {},
    picbed: structuredClone(DEFAULT_PICBED_CONFIG),
  };
}
