


## **Step 1 — Close MongoDB service**

Your MongoDB is probably running as a Windows service right now, and you can’t run `mongod` manually while it’s active.

1. Open **PowerShell as Administrator** (right-click → *Run as administrator*).
2. Stop the service:

   ```powershell
   net stop MongoDB
   ```

   You should see:
   `The MongoDB service was stopped successfully.`

---

## **Step 2 — Start mongod in replica set mode**

Still in **Administrator PowerShell** (or even normal PowerShell now that the service is stopped):

```powershell
& "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\Program Files\MongoDB\Server\7.0\data" --replSet rs0
```

* Leave this window **open** — it’s your MongoDB server log.
* If you close it, MongoDB will stop.

---

## **Step 3 — now run**

```
npm run dev

```