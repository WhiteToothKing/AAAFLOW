export enum TaskStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  ROUTING = 'routing',
  GENERATING = 'generating',
  REVIEW = 'review',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ArtType {
  CHARACTER = 'character',
  SCENE = 'scene',
  PROP = 'prop',
  UI = 'ui',
  CONCEPT = 'concept',
  TEXTURE = 'texture',
  ICON = 'icon',
  POSTER = 'poster',
  OTHER = 'other',
}

export enum ArtStyle {
  REALISTIC = 'realistic',
  CARTOON = 'cartoon',
  ANIME = 'anime',
  PIXEL = 'pixel',
  LOW_POLY = 'low_poly',
  HAND_PAINTED = 'hand_painted',
  FLAT = 'flat',
  SEMI_REALISTIC = 'semi_realistic',
  OTHER = 'other',
}

export enum GenerationMode {
  API = 'api',
  COMFYUI = 'comfyui',
}

export enum GenerationProvider {
  DALL_E = 'dall_e',
  GEMINI = 'gemini',
  MIDJOURNEY = 'midjourney',
  STABLE_DIFFUSION = 'stable_diffusion',
  COMFYUI_LOCAL = 'comfyui_local',
  COMFYUI_CLOUD = 'comfyui_cloud',
  JIMENG = 'jimeng',
  MINIMAX = 'minimax',
  BANANA = 'banana',
}

export interface GenerationResult {
  id: string;
  task_id: string;
  image_url: string;
  thumbnail_url?: string;
  provider: GenerationProvider;
  generation_params?: Record<string, unknown>;
  generation_time_seconds?: number;
  is_selected: boolean;
  rating?: number;
  feedback?: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  department?: string;
  role: string;
  is_active: boolean;
  org_id: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  org_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  detail?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  items: AuditLogItem[];
}

export interface ArtTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  art_type?: ArtType;
  art_style?: ArtStyle;
  generation_mode?: GenerationMode;
  generation_provider?: GenerationProvider;
  width?: number;
  height?: number;
  num_variations: number;
  reference_images: string[];
  tags: string[];
  ai_analysis?: Record<string, unknown>;
  optimized_prompt?: string;
  negative_prompt?: string;
  priority: number;
  org_id: string;
  creator_id?: string;
  results: GenerationResult[];
  created_at: string;
  updated_at: string;
}

export interface TaskListResponse {
  tasks: ArtTask[];
  total: number;
  page: number;
  page_size: number;
}

export interface TaskCreatePayload {
  title: string;
  description: string;
  art_type?: ArtType;
  art_style?: ArtStyle;
  generation_mode?: GenerationMode;
  generation_provider?: GenerationProvider;
  width?: number;
  height?: number;
  num_variations?: number;
  reference_images?: string[];
  tags?: string[];
  priority?: number;
  /** When true, backend should start generation pipeline immediately after create */
  auto_process?: boolean;
}

export interface ComfyUIWorkflow {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  workflow_json: Record<string, unknown>;
  art_types: string[];
  art_styles: string[];
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  art_type: ArtType;
  art_style: ArtStyle;
  recommended_mode: GenerationMode;
  recommended_provider: GenerationProvider;
  optimized_prompt: string;
  negative_prompt: string;
  recommended_size: { width: number; height: number };
  tags: string[];
  complexity: string;
  confidence: number;
  reasoning: string;
}

export interface RoutingDecision {
  mode: GenerationMode;
  provider: string;
  reason: string;
  available_providers: Array<{
    provider: string;
    available: boolean;
    mode: string;
  }>;
}

export interface AnalyzeResponse {
  analysis: AIAnalysis;
  routing: RoutingDecision;
  /** 与 analysis 的类型/风格匹配的注册技能（后端 skill_registry）；旧后端可能缺省 */
  recommended_skills?: Skill[];
}

export interface AnalyzeRequest {
  title: string;
  description: string;
  reference_images?: string[];
  tags?: string[];
  width?: number;
  height?: number;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  ANALYSIS = 'analysis',
  SKILL_INVOKE = 'skill_invoke',
  GENERATION_RESULT = 'generation_result',
  ERROR = 'error',
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  message_type: MessageType;
  metadata_json?: Record<string, unknown>;
  image_urls: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  title: string;
  task_id?: string;
  is_active: boolean;
  llm_provider?: string;
  llm_model?: string;
  org_id: string;
  user_id?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatSessionListItem {
  id: string;
  title: string;
  task_id?: string;
  is_active: boolean;
  llm_provider?: string;
  llm_model?: string;
  org_id: string;
  user_id?: string;
  message_count: number;
  last_message_preview?: string;
  created_at: string;
  updated_at: string;
}

export interface LlmModelOption {
  id: string;
  label: string;
}

export interface LlmProviderOption {
  id: string;
  label: string;
  available: boolean;
  models: LlmModelOption[];
}

export interface LlmOptionsResponse {
  default_provider: string;
  default_models: Record<string, string>;
  providers: LlmProviderOption[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  art_types: string[];
  art_styles: string[];
  mode: string;
  provider: string;
}

export const COMPLEXITY_LABELS: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export const ART_TYPE_LABELS: Record<ArtType, string> = {
  [ArtType.CHARACTER]: '角色',
  [ArtType.SCENE]: '场景',
  [ArtType.PROP]: '道具',
  [ArtType.UI]: 'UI',
  [ArtType.CONCEPT]: '概念图',
  [ArtType.TEXTURE]: '纹理',
  [ArtType.ICON]: '图标',
  [ArtType.POSTER]: '海报',
  [ArtType.OTHER]: '其他',
};

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  [ArtStyle.REALISTIC]: '写实',
  [ArtStyle.CARTOON]: '卡通',
  [ArtStyle.ANIME]: '动漫',
  [ArtStyle.PIXEL]: '像素',
  [ArtStyle.LOW_POLY]: '低多边形',
  [ArtStyle.HAND_PAINTED]: '手绘',
  [ArtStyle.FLAT]: '扁平',
  [ArtStyle.SEMI_REALISTIC]: '半写实',
  [ArtStyle.OTHER]: '其他',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: '等待中',
  [TaskStatus.ANALYZING]: '分析中',
  [TaskStatus.ROUTING]: '路由中',
  [TaskStatus.GENERATING]: '生成中',
  [TaskStatus.REVIEW]: '待审核',
  [TaskStatus.COMPLETED]: '已完成',
  [TaskStatus.FAILED]: '失败',
  [TaskStatus.CANCELLED]: '已取消',
};

export const PROVIDER_LABELS: Record<GenerationProvider, string> = {
  [GenerationProvider.DALL_E]: 'DALL-E',
  [GenerationProvider.GEMINI]: 'Gemini',
  [GenerationProvider.MIDJOURNEY]: 'Midjourney',
  [GenerationProvider.STABLE_DIFFUSION]: 'Stable Diffusion',
  [GenerationProvider.COMFYUI_LOCAL]: 'ComfyUI (本地)',
  [GenerationProvider.COMFYUI_CLOUD]: 'ComfyUI (云端)',
  [GenerationProvider.JIMENG]: '即梦 (Jimeng)',
  [GenerationProvider.MINIMAX]: 'MiniMax',
  [GenerationProvider.BANANA]: 'Banana Pro',
};
