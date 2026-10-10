import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { HandoverRecord, WarehouseProfile } from '../types/receipt';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

const HANDOVER_COLLECTION = 'handover_records';
const PROFILE_COLLECTION = 'warehouse_profiles';

/**
 * Saves a handover record to Firestore (Auto-Sync to Cloud without manual login)
 */
export async function saveHandoverRecordToFirestore(
  record: HandoverRecord
): Promise<boolean> {
  const docRef = doc(db, HANDOVER_COLLECTION, record.id);
  try {
    await setDoc(docRef, {
      ...record,
      syncedToCloud: true,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${HANDOVER_COLLECTION}/${record.id}`);
    return false;
  }
}

/**
 * Real-time listener for handover records from Firestore
 */
export function subscribeToHandoverRecords(
  onRecords: (records: HandoverRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, HANDOVER_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: HandoverRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as HandoverRecord;
        records.push({
          ...data,
          id: docSnap.id,
          syncedToSheets: true, // Synced to cloud database
        });
      });
      onRecords(records);
    },
    (error) => {
      const info = handleFirestoreError(error, OperationType.LIST, HANDOVER_COLLECTION);
      if (onError) onError(new Error(info.error));
    }
  );
}

/**
 * Deletes a handover record from Firestore
 */
export async function deleteHandoverRecordFromFirestore(
  recordId: string
): Promise<boolean> {
  const docRef = doc(db, HANDOVER_COLLECTION, recordId);
  try {
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${HANDOVER_COLLECTION}/${recordId}`);
    return false;
  }
}

/**
 * Saves warehouse profile to Firestore
 */
export async function saveWarehouseProfileToFirestore(
  profile: WarehouseProfile,
  profileId: string = 'default_profile'
): Promise<boolean> {
  const docRef = doc(db, PROFILE_COLLECTION, profileId);
  try {
    await setDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PROFILE_COLLECTION}/${profileId}`);
    return false;
  }
}

/**
 * Loads warehouse profile from Firestore
 */
export async function loadWarehouseProfileFromFirestore(
  profileId: string = 'default_profile'
): Promise<WarehouseProfile | null> {
  const docRef = doc(db, PROFILE_COLLECTION, profileId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as WarehouseProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${PROFILE_COLLECTION}/${profileId}`);
    return null;
  }
}
