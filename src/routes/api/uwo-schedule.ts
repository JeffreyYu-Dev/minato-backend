import { Hono } from "hono";
import puppeteer from "puppeteer";

const app = new Hono();

app.post("/", async (c) => {
  // username and password is required and will be stored on the server
  const { username, password } = await c.req.json();

  //   check if schedule is in database / redis

  //   store username and password hashed and salted in database
});

// TODO: CLEAN UP WHOLE FILE
app.get("/", async (c) => {
  async function scrapeTable(url: string) {
    const browser = await puppeteer.launch({
      headless: false, // Set to true for production, false for debugging
      slowMo: 10, // Add delay to see what's happening
    });

    const page = await browser.newPage();

    try {
      // Navigate to login page
      await page.goto(url, {
        waitUntil: "networkidle2",
      });

      console.log("Login page loaded, filling credentials...");

      // Wait for form elements to be ready
      await page.waitForSelector("#txtUsername");
      await page.waitForSelector('[name="txtPassword"]');

      // Fill login form
      await page.type("#txtUsername", "jyu867");
      await page.type('[name="txtPassword"]', "Budweiser59!");

      console.log("Credentials filled, submitting form...");

      await page.click('button[type="submit"]');

      console.log("Navigation completed after login");

      let currentUrl = page.url();
      console.log(currentUrl);

      if (!currentUrl.endsWith("/secure/index.cfm")) {
        throw new Error("Invalid login credentials");
      }

      // check if we have the checkbox

      if (currentUrl === "https://draftmyschedule.uwo.ca/secure/index.cfm") {
        await page.waitForSelector("#agreement");
        await page.click("#agreement");
        await page.click('button[type="submit"]');
      }

      currentUrl = page.url();
      console.log(currentUrl);

      if (
        currentUrl !==
        "https://draftmyschedule.uwo.ca/secure/current_timetable.cfm"
      ) {
        await page.click('a[href="/secure/current_timetable.cfm"]');
        currentUrl = page.url();
        console.log(currentUrl);
      }

      await page.waitForSelector("table", { timeout: 30000 });

      const scheduleData = await page.evaluate(async () => {
        const xpath = "/html/body/div[1]/div[2]/div[6]/table";
        const table = document.evaluate(
          xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue as HTMLTableElement;

        if (!table) {
          return {
            success: false,
            totalRows: 0,
            data: [],
            error: "Table not found",
          };
        }

        // Use '>' to select only direct children
        const rows = Array.from(
          table.querySelectorAll(":scope > tbody > tr, :scope > tr")
        );
        const data = rows.map((row, rowIndex) => {
          const cells = Array.from(
            row.querySelectorAll(":scope > td, :scope > th")
          );
          const rowData = cells.map((cell, index) => {
            const text =
              cell.textContent
                ?.replace(/\t/g, " ")
                .replace(/\s+/g, " ")
                .replace(/[\n\r]/g, "")
                .trim() || "";
            if (index === 9) {
              return text.split(" ");
            }

            // split class data
            return text;
          });

          return {
            rowIndex,
            cells: rowData,
            isHeader: row.querySelector("th") !== null,
          };
        });

        return {
          success: true,
          totalRows: data.length,
          data: data,
        };
      });

      return scheduleData;
    } catch (error) {
      console.error("Error during scraping:", error);

      return {
        success: false,
        totalRows: 0,
        data: [],
        error: (error as Error).message,
      };
    } finally {
      await browser.close();
    }
  }

  const data = await scrapeTable("https://draftmyschedule.uwo.ca/login.cfm");
  console.log(data);
  return c.json(data);
});

type UWO_table =
  | never[]
  | {
      rowIndex: number;
      cells: (string | string[])[];
      isHeader: boolean;
    }[];

// needs fixing too lazy
function splitTable(table: UWO_table) {
  if (table.length === 0) return [];

  //   TODO: fi
  table.forEach((row) => {
    // if (row.cells[3].toString().endsWith("a") || ) {
    // }
  });
}

export default app;
