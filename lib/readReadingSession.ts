/**
 * Read · 一起读状态
 *
 * 只做数据类型和邀请判定，不做持久化。
 * session 只保存在 ReadReader 的 React state 里，
 * 用户退出 ReadReader（activeId 变 null）就自动结束。
 */

export type ReadingPartner = "levi" | "erwin";

export type ReadingSession = {
  bookId: string;
  /** 用户勾选邀请的 */
  invited: ReadingPartner[];
  /** 实际来了的（可能少于 invited） */
  partners: ReadingPartner[];
  startedAt: number;
};

/** 单次邀请被接受的概率（硬币正反面） */
const ACCEPT_CHANCE = 0.5;

/**
 * 用户点了邀请后，独立判定每个被邀请者来/不来。
 */
export function rollInvite(
  invited: ReadingPartner[]
): ReadingPartner[] {
  return invited.filter(() => Math.random() < ACCEPT_CHANCE);
}