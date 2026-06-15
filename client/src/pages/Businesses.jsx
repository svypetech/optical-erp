import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../api";
import { Button, Card, Input, Modal } from "../components/ui";

const CURRENCIES = ["USD", "EUR", "GBP", "PKR", "INR", "JPY", "AUD", "CAD"];

export default function Businesses() {
  const { businesses, refreshBusinesses, selectBusiness, activeId } = useApp();
  const [modal, setModal] = useState(null); // null | {} | business
  const empty = { name: "", currency: "USD", address: "", phone: "", logoUrl: "", notes: "" };
  const [form, setForm] = useState(empty);

  const openAdd = () => {
    setForm(empty);
    setModal({});
  };
  const openEdit = (b) => {
    setForm({
      name: b.name, currency: b.currency, address: b.address || "",
      phone: b.phone || "", logoUrl: b.logoUrl || "", notes: b.notes,
    });
    setModal(b);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (modal && modal.id) await api.updateBusiness(modal.id, form);
    else await api.createBusiness(form);
    setModal(null);
    await refreshBusinesses();
  };

  const remove = async (b) => {
    if (!confirm(`Delete "${b.name}" and its Excel file? This cannot be undone.`)) return;
    await api.deleteBusiness(b.id);
    await refreshBusinesses();
  };

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Businesses
        </h1>
        <div className="flex-1" />
        <Button onClick={openAdd}>+ New Business</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {businesses.map((b) => (
          <Card key={b.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{b.name}</div>
                <div className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {b.currency}
                </div>
              </div>
              {String(activeId) === String(b.id) && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Active
                </span>
              )}
            </div>
            {b.notes && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{b.notes}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => selectBusiness(b.id)}>
                Select
              </Button>
              <Button variant="ghost" onClick={() => openEdit(b)}>
                Edit
              </Button>
              <Button variant="ghost" onClick={() => remove(b)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
        {businesses.length === 0 && (
          <div className="col-span-full grid h-48 place-items-center rounded-2xl border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No businesses yet. Create your first one.
          </div>
        )}
      </div>

      <Modal
        open={!!modal}
        title={modal && modal.id ? "Edit Business" : "New Business"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Currency
            </span>
            <select
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <Input
            label="Shop Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Shop Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Shop Logo (PNG/JPG, optional)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) {
                  alert("Please choose an image under 1 MB.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setForm({ ...form, logoUrl: reader.result });
                reader.readAsDataURL(file);
              }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 dark:text-slate-300"
            />
            {form.logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={form.logoUrl} alt="logo preview" className="h-12 w-12 rounded object-contain ring-1 ring-slate-200" />
                <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })}
                  className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
              </div>
            )}
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
