import { redirect } from "next/navigation";

/** /dersler adresi Ders Planla ekranını açar */
export default function LessonsIndex() {
  redirect("/dersler/yeni");
}
