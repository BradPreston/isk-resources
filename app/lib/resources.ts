import { JSDOM } from "jsdom";
import fs from "fs/promises";
import path from "path";

type ResourceEntry = { title: string; url: string };

type ResourcesData = {
  synced_at: string;
  resources: Record<string, Record<string, ResourceEntry[]>>;
};

export async function fetchResources() {
  const resourcesUrl = process.env.RESOURCES_URL;
  if (!resourcesUrl) {
    throw new Error("RESOURCES_URL environment variable is not set");
  }

  const data: ResourcesData = {
    synced_at: `${new Date().toLocaleDateString("en-us")} ${new Date().toLocaleTimeString("en-us")}`,
    resources: {},
  };

  const res = await fetch(resourcesUrl);
  const html = await res.text();
  const { document } = new JSDOM(html).window;

  let currentSection = "General";
  let currentTab = "Other";

  let sectionTag: string | null = null;

  document.querySelectorAll("h1, h2, h3, h4, h5, h6, a[href]").forEach((el) => {
    const level = Number(el.tagName[1]);
    if (level) {
      if (!sectionTag || level <= Number(sectionTag[1])) {
        sectionTag = el.tagName;
        currentSection = el.textContent.trim();
        data.resources[currentSection] ??= {};
      } else {
        currentTab = el.textContent.trim();
        data.resources[currentSection] ??= {};
        data.resources[currentSection][currentTab] ??= [];
      }
    } else if (el.tagName === "A") {
      const url = (el as HTMLAnchorElement).href;
      const title = el.textContent.trim();
      if (url.startsWith("http") && !url.includes("#") && title) {
        data.resources[currentSection] ??= {};
        data.resources[currentSection][currentTab] ??= [];
        data.resources[currentSection][currentTab].push({ title, url });
      }
    }
  });

  const filePath = path.join(process.cwd(), "public", "data", "resources.json");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
