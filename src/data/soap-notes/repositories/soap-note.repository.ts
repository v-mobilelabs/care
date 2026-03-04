import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toSoapNoteDto,
  type SoapNoteDocument,
  type SoapNoteDto,
} from "../models/soap-note.model";

const soapNotesCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "soapNotes", dependentId);

const soapNoteDoc = (userId: string, noteId: string, dependentId?: string) =>
  soapNotesCol(userId, dependentId).doc(noteId);

export const soapNoteRepository = {
  async create(
    userId: string,
    data: Omit<SoapNoteDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<SoapNoteDto> {
    const now = Timestamp.now();
    const doc = { ...data, userId, createdAt: now };
    const ref = soapNotesCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toSoapNoteDto(ref.id, doc);
  },

  async findBySession(
    userId: string,
    sessionId: string,
    dependentId?: string,
  ): Promise<SoapNoteDto | null> {
    const snap = await soapNotesCol(userId, dependentId)
      .where("sessionId", "==", sessionId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toSoapNoteDto(d.id, d.data() as SoapNoteDocument);
  },

  async update(
    userId: string,
    noteId: string,
    data: Omit<
      SoapNoteDocument,
      "userId" | "sessionId" | "createdAt" | "updatedAt"
    >,
    dependentId?: string,
  ): Promise<SoapNoteDto> {
    const now = Timestamp.now();
    const ref = soapNoteDoc(userId, noteId, dependentId);
    await ref.update({ ...data, updatedAt: now });
    const snap = await ref.get();
    return toSoapNoteDto(snap.id, snap.data() as SoapNoteDocument);
  },

  async findById(
    userId: string,
    noteId: string,
    dependentId?: string,
  ): Promise<SoapNoteDto | null> {
    const snap = await soapNoteDoc(userId, noteId, dependentId).get();
    if (!snap.exists) return null;
    return toSoapNoteDto(snap.id, snap.data() as SoapNoteDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<SoapNoteDto[]> {
    const snap = await soapNotesCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toSoapNoteDto(d.id, d.data() as SoapNoteDocument),
    );
  },

  async delete(
    userId: string,
    noteId: string,
    dependentId?: string,
  ): Promise<void> {
    await soapNoteDoc(userId, noteId, dependentId).delete();
  },
};
