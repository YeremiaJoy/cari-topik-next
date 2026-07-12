export type Plan = 'free' | 'pro'
export type Role = 'admin' | 'guest'
export type Personality = 'introvert' | 'extrovert'
export type Category = 'pasangan' | 'teman' | 'keluarga'
export type Depth = 'ringan' | 'sedang' | 'dalam'
export type Bias = 'introvert' | 'extrovert' | 'netral'

export const FREE_MAX_PARTICIPANTS = 2
export const FREE_MAX_QUESTIONS = 5
export const FREE_MAX_ROOMS = 1
export const QUESTION_RESET_MS = 6 * 60 * 60 * 1000
export const ROOM_DELETE_COOLDOWN_MS = 6 * 60 * 60 * 1000

/** Harga Pro per tahun. Ubah dua angka ini untuk atur promo. */
export const PRO_PRICE = 50000
export const PRO_PRICE_AFTER_DISCOUNT = 19000
export const PRO_DISCOUNT_PERCENT = Math.round((1 - PRO_PRICE_AFTER_DISCOUNT / PRO_PRICE) * 100)
export const formatRupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
export const PRO_PRICE_LABEL = formatRupiah(PRO_PRICE_AFTER_DISCOUNT)

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  plan: Plan
  role: Role
  createdAt: string
}

export interface RoomSetup {
  participantCount: number
  category: Category
  personalities?: [Personality, Personality]
}

export interface Room {
  id: string
  setup: RoomSetup
  deck: string[]
  currentIndex: number
  favorites: string[]
  status: 'active' | 'completed'
  createdAt: string
  endedAt?: string
  /** Index kartu pertama pada jendela kuota free yang sedang berjalan. */
  windowStart?: number
  /** Kapan kartu terakhir jendela kuota dimainkan; kuota reset 6 jam setelahnya. */
  exhaustedAt?: string
}

export type Localized = { id: string; en: string }

export interface Question {
  id: string
  text: Localized
  category: Category
  depth: Depth
  bias: Bias
  /** Kartu khusus mode grup (3+ orang); tanpa flag ini kartu untuk berdua. */
  forGroup?: boolean
}

export type PaywallReason = 'participants' | 'questions' | 'rooms'

export class PaywallError extends Error {
  reason: PaywallReason
  /** Untuk 'questions': kapan kuota kartu free terbuka lagi (ISO). */
  resetAt?: string
  constructor(reason: PaywallReason, resetAt?: string) {
    super(`paywall:${reason}`)
    this.name = 'PaywallError'
    this.reason = reason
    this.resetAt = resetAt
  }
}

/** Konfigurasi aplikasi yang bisa diubah admin saat runtime. */
export interface AppConfig {
  freeMaxParticipants: number
  freeMaxQuestions: number
  freeMaxRooms: number
  proPrice: number
  proPriceAfterDiscount: number
  maintenance?: {
    enabled: boolean
    message: Localized
  }
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  freeMaxParticipants: FREE_MAX_PARTICIPANTS,
  freeMaxQuestions: FREE_MAX_QUESTIONS,
  freeMaxRooms: FREE_MAX_ROOMS,
  proPrice: PRO_PRICE,
  proPriceAfterDiscount: PRO_PRICE_AFTER_DISCOUNT,
}

export interface Announcement {
  message: Localized
  enabled: boolean
}

export interface AdminStats {
  totalUsers: number
  proUsers: number
  adminUsers: number
  totalRooms: number
  activeRooms: number
  completedRooms: number
  totalFavorites: number
  totalQuestions: number
}

export interface WeeklyCount {
  /** ISO tanggal Senin awal minggu. */
  weekStart: string
  count: number
}

export interface AdminAnalytics {
  /** 12 minggu terakhir, urut lama → baru. */
  signupsByWeek: WeeklyCount[]
  roomsByWeek: WeeklyCount[]
  planCounts: { free: number; pro: number }
  roomsByCategory: Array<{ category: Category; count: number }>
  roomStatus: { active: number; completed: number }
  questionsByCategory: Array<{ category: Category; counts: Record<Depth, number> }>
}

export interface AdminService {
  getStats(): Promise<AdminStats>
  getAnalytics(): Promise<AdminAnalytics>
  listUsers(): Promise<User[]>
  setUserPlan(id: string, plan: Plan): Promise<User>
  deleteUser(id: string): Promise<void>
  listQuestions(): Promise<Question[]>
  createQuestion(input: Omit<Question, 'id'>): Promise<Question>
  updateQuestion(id: string, patch: Partial<Omit<Question, 'id'>>): Promise<Question>
  deleteQuestion(id: string): Promise<void>
  getConfig(): Promise<AppConfig>
  updateConfig(patch: Partial<AppConfig>): Promise<AppConfig>
  getAnnouncement(): Promise<Announcement | null>
  setAnnouncement(announcement: Announcement | null): Promise<void>
}

/**
 * Akun simulasi untuk pemilih akun Google di login mock.
 * Role ditentukan backend; di mock, akun membawa role seolah dari respons API.
 */
export interface AuthService {
  getCurrentUser(): Promise<User | null>
  /** Tukar access token Google (implicit flow) menjadi sesi + profil user. */
  loginWithGoogle(accessToken: string): Promise<User>
  logout(): Promise<void>
  /** Hapus akun beserta seluruh data miliknya (room, favorit). */
  deleteAccount(): Promise<void>
}

export interface SnapCharge {
  token: string
  redirectUrl: string
  referenceId: string
}

export interface PaymentService {
  /** Mulai pembelian plan; hasilnya dipakai untuk window.snap.pay(token). */
  createCharge(plan: Plan): Promise<SnapCharge>
}

export interface RoomService {
  createRoom(setup: RoomSetup): Promise<Room>
  getRoom(id: string): Promise<Room | null>
  listRooms(): Promise<Room[]>
  advanceCard(roomId: string): Promise<Room>
  toggleFavorite(roomId: string, questionId: string): Promise<Room>
  endSession(roomId: string): Promise<Room>
  /** Hapus room selesai. Akun free harus menunggu 6 jam setelah room selesai. */
  deleteRoom(roomId: string): Promise<void>
}

export interface QuestionService {
  buildDeck(setup: RoomSetup): Question[]
  getById(id: string): Question | undefined
}
