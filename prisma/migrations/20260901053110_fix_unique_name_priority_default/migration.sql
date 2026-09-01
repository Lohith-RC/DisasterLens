-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "location_lat" REAL,
    "location_lng" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SOS_Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "disaster_type" TEXT NOT NULL,
    "injury_severity" TEXT NOT NULL,
    "battery_level" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority_score" REAL NOT NULL DEFAULT 0,
    "ai_explanation" TEXT,
    "location_lat" REAL,
    "location_lng" REAL,
    "group_size" INTEGER,
    "environment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SOS_Signal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "recipientId" TEXT,
    "signalId" TEXT,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "SOS_Signal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
