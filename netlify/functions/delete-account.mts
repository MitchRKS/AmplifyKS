// Deletes the calling user's account: all of their Firestore data, then the
// Firebase Auth user. The caller proves identity with their own ID token —
// this can only ever delete the authenticated caller's account.
//
// Lives here (not a Firebase Cloud Function) because the Firebase project is
// on the Spark plan; Netlify Functions with firebase-admin do the same job.
// Requires FIREBASE_SERVICE_ACCOUNT in the Netlify environment.

import { FieldPath } from 'firebase-admin/firestore';

import { getAdmin, notConfigured, verifyBearer } from './_shared/admin.mts';

const bad = (message: string, status = 400): Response =>
  Response.json({ error: message }, { status });

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return bad('POST only', 405);

  const admin = getAdmin();
  if (!admin) return notConfigured();
  const { auth, db } = admin;

  const user = await verifyBearer(auth, req);
  if (!user) return bad('Sign in required.', 401);
  const { uid } = user;

  try {
    // users/{uid} and every subcollection (savedOfficials, surveys, quizs,
    // actionHistory, ...) — recursiveDelete walks them all.
    await db.recursiveDelete(db.collection('users').doc(uid));

    // legislatorRatings doc ids are `${uid}_${legislatorId}` — prefix scan.
    const ratings = await db
      .collection('legislatorRatings')
      .where(FieldPath.documentId(), '>=', `${uid}_`)
      .where(FieldPath.documentId(), '<=', `${uid}_\uf8ff`)
      .get();

    const testimonies = await db.collection('testimonies').where('userId', '==', uid).get();
    const passkeys = await db.collection('passkeyCredentials').where('uid', '==', uid).get();

    const batch = db.batch();
    for (const doc of [...ratings.docs, ...testimonies.docs, ...passkeys.docs]) {
      batch.delete(doc.ref);
    }
    batch.delete(db.collection('webauthnChallenges').doc(uid));
    await batch.commit();

    await auth.deleteUser(uid);
    return Response.json({ ok: true });
  } catch (error: any) {
    console.error('delete-account failed for', uid, error);
    return bad('Account deletion failed. Please try again.', 500);
  }
};
