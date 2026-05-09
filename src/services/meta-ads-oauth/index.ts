// Public surface for Meta Ads OAuth + sync.

export {
  buildAuthorizeUrl,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  fetchAdsMetaUserId,
  fetchGrantedScopes,
  META_ADS_SCOPES,
} from "./oauth";

export {
  encryptMetaAdsToken,
  decryptMetaAdsToken,
  getTokenLastFour,
} from "./crypto";

export {
  listBusinesses,
  listAdAccounts,
  getCampaignAdInsights,
  type MetaInsightsRow,
} from "./client";

export { syncLiveCampaignFromMeta } from "./sync";
