import { Timestamp } from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toReferralDto,
  type ReferralDocument,
  type ReferralDto,
  type ListReferralsInput,
  type PaginatedReferrals,
  type ReferralStatus,
} from "../models/referral.model";

// ── Path helpers ──────────────────────────────────────────────────────────────

const referralsCol = (profileId: string) => scopedCol(profileId, "referrals");

// ── Repository ────────────────────────────────────────────────────────────────

export const referralRepository = {
  async create(
    profileId: string,
    data: Omit<ReferralDocument, "userId" | "createdAt">,
  ): Promise<ReferralDto> {
    const now = Timestamp.now();
    const doc: ReferralDocument = {
      userId: profileId,
      ...data,
      createdAt: now,
    };
    const ref = referralsCol(profileId).doc();
    await ref.set(stripUndefined(doc));
    return toReferralDto(ref.id, doc);
  },

  async findBySession(
    profileId: string,
    sessionId: string,
  ): Promise<ReferralDto | null> {
    const snap = await referralsCol(profileId)
      .where("sessionId", "==", sessionId)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toReferralDto(d.id, d.data() as ReferralDocument);
  },

  async updateStatus(
    profileId: string,
    referralId: string,
    status: ReferralStatus,
  ): Promise<void> {
    const now = Timestamp.now();
    const update: Record<string, unknown> = { status, updatedAt: now };
    if (status === "accepted") update.acceptedAt = now;
    if (status === "dismissed") update.dismissedAt = now;
    if (status === "completed") update.completedAt = now;
    await referralsCol(profileId).doc(referralId).update(update);
  },

  async listPaginated(
    profileId: string,
    opts: ListReferralsInput,
  ): Promise<PaginatedReferrals> {
    let query = referralsCol(profileId).orderBy("createdAt", "desc");

    if (opts.cursor) {
      query = query.startAfter(
        Timestamp.fromDate(new Date(opts.cursor)),
      ) as typeof query;
    }

    const fetchLimit = opts.limit + 1;
    const snap = await query.limit(fetchLimit).get();

    let referrals = snap.docs.map((d) =>
      toReferralDto(d.id, d.data() as ReferralDocument),
    );

    // Client-side filtering to avoid composite indexes
    if (opts.status) {
      referrals = referrals.filter((r) => r.status === opts.status);
    }
    if (opts.specialist) {
      const wanted = opts.specialist.toLowerCase();
      referrals = referrals.filter(
        (r) => r.specialist.toLowerCase() === wanted,
      );
    }

    const hasMore = referrals.length > opts.limit;
    const page = hasMore ? referrals.slice(0, opts.limit) : referrals;
    const nextCursor = hasMore
      ? (page[page.length - 1]?.createdAt ?? null)
      : null;

    let totalCount: number | undefined;
    if (!opts.cursor) {
      const countSnap = await referralsCol(profileId).count().get();
      totalCount = countSnap.data().count;
    }

    return { referrals: page, nextCursor, totalCount };
  },
};
