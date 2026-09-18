/* =========================================================================
   iCity · Bio 自动刷新调度
   -------------------------------------------------------------------------
   规则：
     - 首次（lastBioUpdate === 0）：立刻刷新
     - < 16h：不动
     - 16h ~ 24h：50% 概率刷新（掷骰失败则不刷新，等下个 tick）
     - >= 24h：强制刷新

   调度频率：每 30 分钟检查一次。
   ========================================================================= */

export const BIO_REFRESH_MIN_MS = 16 * 60 * 60 * 1000;
export const BIO_REFRESH_MAX_MS = 24 * 60 * 60 * 1000;
export const BIO_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function shouldRefreshBio(
  lastBioUpdate: number
): boolean {
  /* 首次：立刻刷新 */
  if (!lastBioUpdate || lastBioUpdate <= 0) return true;

  const elapsed = Date.now() - lastBioUpdate;

  /* 16h 前：不动 */
  if (elapsed < BIO_REFRESH_MIN_MS) return false;

  /* 24h 后：强制 */
  if (elapsed >= BIO_REFRESH_MAX_MS) return true;

  /* 16h ~ 24h：50% 概率 */
  return Math.random() < 0.5;
}