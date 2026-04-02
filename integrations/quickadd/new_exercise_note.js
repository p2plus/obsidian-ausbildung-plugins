module.exports = async (params) => {
  const { app, quickAddApi } = params;

  const title = await quickAddApi.inputPrompt("Titel der Uebung");
  if (!title) {
    return;
  }

  const modulId = (await quickAddApi.inputPrompt("Modul-ID", "LF01")) || "LF01";
  const jahr = (await quickAddApi.suggester(["1", "2", "3"], ["1", "2", "3"])) || "1";
  const relevanz =
    (await quickAddApi.suggester(
      ["mittel", "hoch", "ihk-kritisch"],
      ["mittel", "hoch", "ihk-kritisch"]
    )) || "hoch";
  const folder = (await quickAddApi.inputPrompt("Zielordner im Vault", "Lernen/Uebungen")) || "Lernen/Uebungen";

  const safeTitle = title.replace(/[\\/:*?"<>|]/g, "-").trim();
  const filePath = await ensureUniquePath(app, `${folder}/${safeTitle}.md`);
  const content = buildExerciseNote(title, modulId, jahr, relevanz);

  await ensureFolder(app, folder);
  const file = await app.vault.create(filePath, content);
  await app.workspace.getLeaf(true).openFile(file);
};

async function ensureFolder(app, folderPath) {
  const parts = folderPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const exists = await app.vault.adapter.exists(current);
    if (!exists) {
      await app.vault.createFolder(current);
    }
  }
}

async function ensureUniquePath(app, basePath) {
  const extensionIndex = basePath.lastIndexOf(".");
  const stem = extensionIndex >= 0 ? basePath.slice(0, extensionIndex) : basePath;
  const extension = extensionIndex >= 0 ? basePath.slice(extensionIndex) : "";

  let attempt = basePath;
  let index = 2;
  while (await app.vault.adapter.exists(attempt)) {
    attempt = `${stem} ${index}${extension}`;
    index += 1;
  }
  return attempt;
}

function buildExerciseNote(title, modulId, jahr, relevanz) {
  const today = window.moment().format("YYYY-MM-DD");
  return `---
lernstatus: "neu"
lerntyp: "uebung"
modul_id: "${modulId}"
pruefungsrelevanz: "${relevanz}"
ausbildungsjahr: "${jahr}"
score_last:
score_best:
last_review:
next_review:
time_estimate_min: 45
created: "${today}"
---

# ${title}

## Aufgabe

-

## Annahmen

-

## Bearbeitung

-

## Ergebnis

-

## Fehler und Learnings

-`;
}
