import { db } from "@/lib/firebase/admin";
import { type GuidelineDocument } from "../models/guideline.model";

const COLLECTION = "guidelines";

export class GuidelineRepository {
  private collection() {
    return db.collection(COLLECTION);
  }

  async findById(id: string): Promise<GuidelineDocument | null> {
    const doc = await this.collection().doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as GuidelineDocument;
  }

  async findByCategory(category: string): Promise<GuidelineDocument[]> {
    const snapshot = await this.collection()
      .where("category", "==", category)
      .get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as GuidelineDocument,
    );
  }

  async findAll(): Promise<GuidelineDocument[]> {
    const snapshot = await this.collection().get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as GuidelineDocument,
    );
  }

  async create(
    guideline: Omit<GuidelineDocument, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const docRef = await this.collection().add({
      ...guideline,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  }
}

export const guidelineRepository = new GuidelineRepository();
