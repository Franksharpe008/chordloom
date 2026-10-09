// A separate take directory preserves previously exported performances.
export async function writeExportFolder(directory, entries, title, backup, readme) {
  if (!entries.length) throw Error("Render WAV or MIDI first.");
  const safe = title.replace(/[^a-z0-9 _-]/gi, "").trim().slice(0, 70) || "Chordloom";
  const name = safe + "-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomUUID().slice(0, 8);
  const take = await directory.getDirectoryHandle(name, { create: true });
  const files = [...entries.map(e => e.file),
    new File([backup], "Session.json", { type: "application/json" }),
    new File([readme], "README.txt", { type: "text/plain" })];
  for (const file of files) {
    if (!/^[a-z0-9 _.-]+\.(wav|mid|json|txt)$/i.test(file.name) || file.name.includes(".."))
      throw Error("Invalid export filename.");
    const handle = await take.getFileHandle(file.name, { create: true });
    const writer = await handle.createWritable();
    try { await writer.write(file); await writer.close(); }
    catch (error) { await writer.abort().catch(() => {}); throw error; }
  }
  return { name, count: entries.length };
}
