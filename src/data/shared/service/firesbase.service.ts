import { db, storage } from "@/lib/firebase/admin";
import type { Firestore } from "firebase-admin/firestore";

type Bucket = ReturnType<typeof storage.bucket>;

export class FirebaseService {
  private static instance: FirebaseService;
  private readonly db: Firestore;
  private readonly bucket: Bucket;

  private constructor() {
    this.db = db;
    this.bucket = storage.bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    );
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  public getDb(): Firestore {
    return this.db;
  }

  public getBucket(): Bucket {
    return this.bucket;
  }
}
