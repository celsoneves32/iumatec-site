import { NextResponse } from "next/server"
import { getIumatecCategories } from "@/lib/iumatec"

export async function GET() {
  const categories = getIumatecCategories()
  return NextResponse.json(categories)
}