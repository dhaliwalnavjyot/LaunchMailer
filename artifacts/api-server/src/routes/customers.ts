import { Router } from "express";
import { eq, ilike, or, and, isNotNull, inArray, desc, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { customersTable, uploadsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

// GET /api/customers
router.get("/customers", requireAuth, async (req, res) => {
  try {
    const { search, hasEmail, hasPhone, city, tags, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    if (search) {
      const searchLike = `%${search}%`;
      conditions.push(
        or(
          ilike(customersTable.firstName, searchLike),
          ilike(customersTable.lastName, searchLike),
          ilike(customersTable.email, searchLike),
          ilike(customersTable.phone, searchLike),
          ilike(customersTable.city, searchLike),
        )
      );
    }
    if (hasEmail === "true") conditions.push(isNotNull(customersTable.email));
    if (hasPhone === "true") conditions.push(isNotNull(customersTable.phone));
    if (city) conditions.push(ilike(customersTable.city, `%${city}%`));
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        conditions.push(sql`${customersTable.tags} && ${tagList}::text[]`);
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [customers, [totalRow]] = await Promise.all([
      db.select().from(customersTable).where(where).orderBy(desc(customersTable.createdAt)).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(customersTable).where(where),
    ]);

    res.json({
      customers,
      total: Number(totalRow?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "List customers error");
    res.status(500).json({ error: "Failed to list customers" });
  }
});

// POST /api/customers/import
router.post("/customers/import", requireAuth, async (req, res) => {
  try {
    const { customers: rows, updateExisting } = req.body as {
      customers: Array<{
        firstName?: string; lastName?: string; email?: string;
        phone?: string; city?: string; tags?: string; notes?: string;
      }>;
      updateExisting: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "No customers provided" });
      return;
    }

    let created = 0, updated = 0, skipped = 0;
    const errors: Array<{ row: number; field: string; message: string; value?: string }> = [];
    const emailsInBatch = new Set<string>();
    const phonesInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate at least one contact method
      if (!row.email && !row.phone) {
        errors.push({ row: rowNum, field: "email/phone", message: "At least one of email or phone is required" });
        skipped++;
        continue;
      }

      // Validate email format
      if (row.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          errors.push({ row: rowNum, field: "email", message: "Invalid email format", value: row.email });
          skipped++;
          continue;
        }
        // Check duplicate in batch
        const normalizedEmail = row.email.toLowerCase();
        if (emailsInBatch.has(normalizedEmail)) {
          errors.push({ row: rowNum, field: "email", message: "Duplicate email in file", value: row.email });
          skipped++;
          continue;
        }
        emailsInBatch.add(normalizedEmail);
      }

      // Check duplicate phone in batch
      if (row.phone) {
        const normalizedPhone = row.phone.replace(/\s/g, "");
        if (phonesInBatch.has(normalizedPhone)) {
          errors.push({ row: rowNum, field: "phone", message: "Duplicate phone in file", value: row.phone });
          skipped++;
          continue;
        }
        phonesInBatch.add(normalizedPhone);
      }

      const tags = row.tags
        ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : [];

      // Check if exists (by email or phone)
      let existingCustomer = null;
      if (row.email) {
        const [found] = await db.select().from(customersTable)
          .where(eq(customersTable.email, row.email.toLowerCase())).limit(1);
        existingCustomer = found;
      }
      if (!existingCustomer && row.phone) {
        const [found] = await db.select().from(customersTable)
          .where(eq(customersTable.phone, row.phone)).limit(1);
        existingCustomer = found;
      }

      if (existingCustomer) {
        if (updateExisting) {
          await db.update(customersTable)
            .set({
              firstName: row.firstName || existingCustomer.firstName,
              lastName: row.lastName || existingCustomer.lastName,
              email: row.email ? row.email.toLowerCase() : existingCustomer.email,
              phone: row.phone || existingCustomer.phone,
              city: row.city || existingCustomer.city,
              tags: tags.length > 0 ? tags : existingCustomer.tags,
              notes: row.notes || existingCustomer.notes,
              updatedAt: new Date(),
            })
            .where(eq(customersTable.id, existingCustomer.id));
          updated++;
        } else {
          skipped++;
        }
      } else {
        await db.insert(customersTable).values({
          firstName: row.firstName || null,
          lastName: row.lastName || null,
          email: row.email ? row.email.toLowerCase() : null,
          phone: row.phone || null,
          city: row.city || null,
          tags,
          notes: row.notes || null,
        });
        created++;
      }
    }

    // Record upload
    const [upload] = await db.insert(uploadsTable).values({
      filename: `import-${Date.now()}.csv`,
      recordCount: rows.length,
      successCount: created + updated,
      errorCount: errors.length,
    }).returning();

    res.json({ created, updated, skipped, errors, uploadId: upload.id });
  } catch (err) {
    req.log.error({ err }, "Import customers error");
    res.status(500).json({ error: "Failed to import customers" });
  }
});

// GET /api/customers/export
router.get("/customers/export", requireAuth, async (req, res) => {
  try {
    const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));

    const headers = ["First Name", "Last Name", "Email", "Phone", "City", "Tags", "Notes", "Unsubscribed", "Created At"];
    const rows = customers.map((c) => [
      c.firstName || "",
      c.lastName || "",
      c.email || "",
      c.phone || "",
      c.city || "",
      (c.tags || []).join(", "),
      c.notes || "",
      c.unsubscribed ? "Yes" : "No",
      c.createdAt.toISOString(),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="customers-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    req.log.error({ err }, "Export customers error");
    res.status(500).json({ error: "Failed to export customers" });
  }
});

// GET /api/customers/:id
router.get("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Get customer error");
    res.status(500).json({ error: "Failed to get customer" });
  }
});

// PUT /api/customers/:id
router.put("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const body = req.body as {
      firstName?: string; lastName?: string; email?: string;
      phone?: string; city?: string; tags?: string[]; notes?: string;
    };

    const [customer] = await db.update(customersTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(customersTable.id, id))
      .returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    req.log.error({ err }, "Update customer error");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

// DELETE /api/customers/:id
router.delete("/customers/:id", requireAuth, async (req, res) => {
  try {
    const id = String(req.params["id"]);
    const [deleted] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete customer error");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

export default router;
