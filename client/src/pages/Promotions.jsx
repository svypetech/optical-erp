import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card } from "../components/ui";
import { openWhatsApp } from "../waHelper";

export default function Promotions() {
  const { activeId, activeBusiness } = useApp();
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all"); // all | repeat | withDue
  const [sent, setSent] = useState({}); // id -> true (this session)
  const shop = activeBusiness?.name || "our shop";

  const defaultMsg =
    `Dear customer,\n\n${shop} is offering a special discount this week! ` +
    `Visit us to upgrade your eyewear at great prices.\n\nThank you!`;
  const [message, setMessage] = useState(defaultMsg);

  const load = async () => {
    if (!activeId) return;
    setCustomers(await api.listCustomers(activeId));
  };
  useEffect(() => { load().catch(() => {}); }, [activeId]);
  useEffect(() => { setMessage(defaultMsg); /* eslint-disable-next-line */ }, [activeBusiness?.name]);

  const list = useMemo(() => {
    let arr = customers.filter((c) => String(c.mobile).replace(/\D/g, "").length >= 7);
    if (filter === "repeat") arr = arr.filter((c) => c.salesCount >= 2);
    if (filter === "withDue") arr = arr.filter((c) => c.totalDue > 0);
    return arr;
  }, [customers, filter]);

  const send = (c) => {
    openWhatsApp(c.mobile, message);
    setSent((s) => ({ ...s, [c.id]: true }));
  };

  if (!activeId)
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Create a business first.
      </div>
    );

  const sentCount = Object.keys(sent).length;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Promotional Messages</h1>
      <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
        Write your offer, then send it to each customer on WhatsApp. The message is prefilled and you can still edit it in WhatsApp before sending.
      </p>

      <Card className="mb-5">
        <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Offer Message</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Send to:</span>
          {[
            { k: "all", label: "All customers" },
            { k: "repeat", label: "Repeat customers" },
            { k: "withDue", label: "Customers with dues" },
          ].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)}
              className={"rounded-full px-3 py-1 text-xs font-semibold " +
                (filter === f.k ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300")}>
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-xs text-slate-400">{sentCount} sent • {list.length} in list</span>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <th className="px-4 py-3">Name</th><th className="px-4 py-3">Mobile</th>
            <th className="px-4 py-3 text-right">Bills</th><th className="px-4 py-3 text-right">Due</th><th /></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No customers with a mobile number in this filter.</td></tr>}
            {list.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700/60">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{c.name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.mobile}</td>
                <td className="px-4 py-3 text-right">{c.salesCount}</td>
                <td className="px-4 py-3 text-right text-rose-600">{c.totalDue > 0 ? c.totalDue : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => send(c)}
                    className={"rounded-md px-3 py-1.5 text-xs font-semibold " +
                      (sent[c.id]
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        : "bg-emerald-600 text-white hover:bg-emerald-700")}>
                    {sent[c.id] ? "✓ Sent — send again" : "Send WhatsApp"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
