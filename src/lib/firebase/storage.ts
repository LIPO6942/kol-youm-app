import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./client";

export const uploadProfileImage = async (userId: string, file: File, type: 'fullBody' | 'closeup'): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const filePath = `user-photos/${userId}/${type}-${Date.now()}-${file.name}`;
  const storageRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw new Error("File upload failed.");
  }
};
