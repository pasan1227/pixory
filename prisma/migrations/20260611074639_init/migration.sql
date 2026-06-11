-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "previewKey" TEXT NOT NULL,
    "originalKey" TEXT,
    "originalUploaded" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "capturedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "documentSnapshot" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "paymentPref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "format" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "delivery" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_shareToken_key" ON "Book"("shareToken");

-- CreateIndex
CREATE INDEX "Book_sessionToken_idx" ON "Book"("sessionToken");

-- CreateIndex
CREATE INDEX "Photo_bookId_idx" ON "Photo"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE INDEX "Order_bookId_idx" ON "Order"("bookId");
