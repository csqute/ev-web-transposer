import { unzipSync } from "../../vendor/fflate.module.js";
import { parsePrf } from "./prf.js";

/** Extracts every .prf member from one ZIP archive. */
export function prfEntriesFromZip(bytes) {
  const files = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const output = [];
  for (const [path, data] of Object.entries(files)) {
    if (!/\.prf$/i.test(path)) continue;
    output.push({ name: path.split("/").pop() || path, bytes: data });
  }
  return output;
}

/**
 * Parses a mixed set of ZIP/PRF file payloads and merges their banks.
 * Later files win for the same page, matching Android's import order.
 */
export function parsePrfImport(files) {
  const banks = {};
  let records = 0;
  const rejected = [];
  for (const file of files) {
    let candidates;
    try {
      if (/\.zip$/i.test(file.name)) {
        candidates = prfEntriesFromZip(file.bytes);
      } else {
        candidates = [{ name: file.name, bytes: file.bytes }];
      }
    } catch (error) {
      rejected.push(`${file.name}（无法解压）`);
      continue;
    }
    if (!candidates.length) {
      rejected.push(`${file.name}（没有 PRF 文件）`);
      continue;
    }
    for (const candidate of candidates) {
      let parsed;
      try {
        parsed = parsePrf(candidate.bytes);
      } catch (_) {
        rejected.push(`${candidate.name}（读取失败）`);
        continue;
      }
      if (!parsed.records) {
        rejected.push(`${candidate.name}（没有找到音色）`);
        continue;
      }
      for (const [page, names] of Object.entries(parsed.banks)) {
        banks[Number(page)] = names;
      }
      records += parsed.records;
    }
  }
  return { banks, records, rejected, pages: Object.keys(banks).length };
}
