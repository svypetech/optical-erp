# Business Ledger

A small Excel-backed bookkeeping app. No database — all data is stored in `.xlsx`
files on the server (one workbook per business, plus a central account workbook).

## Run

Two terminals.

### 1. Backend
```
cd server
npm install
npm run dev        # http://localhost:4000
```

### 2. Frontend
```
cd client
npm install
npm run dev        # http://localhost:5173
```

Open http://localhost:5173. The first time, the login screen lets you **register**
the single account. After that it switches to **log in**.

## Data
- `server/data/_account.xlsx` — Users sheet + Businesses sheet
- `server/data/business_<id>.xlsx` — Income / Expenses / Daily Summary sheets

Every add/edit/delete rewrites the relevant workbook immediately and the
Daily Summary sheet is recalculated on each save.

## Production build (single server)
```
cd client && npm install && npm run build
cd ../server && npm install && npm start   # serves API + built client on :4000
```
