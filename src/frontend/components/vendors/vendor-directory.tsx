"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, Phone, Pencil, ArrowUpRight } from "lucide-react";
import { api } from "@/frontend/lib/api-client";
import { PageHeader } from "@/frontend/components/common/page-header";
import { EmptyState } from "@/frontend/components/common/empty-state";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Badge } from "@/frontend/components/ui/badge";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Skeleton } from "@/frontend/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/frontend/components/ui/table";
import { vendorCategories } from "@/shared/schemas/vendors";
import type { VendorSummary } from "./types";
import { VendorForm, categoryLabel } from "./vendor-form";

export function VendorDirectory() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [editing, setEditing] = useState<VendorSummary>();
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVendors((await api<{ vendors: VendorSummary[] }>("/api/vendors")).vendors);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Unable to load vendors");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    void api<{ vendors: VendorSummary[] }>("/api/vendors")
      .then((result) => {
        if (active) setVendors(result.vendors);
      })
      .catch((problem) => {
        if (active) setError(problem instanceof Error ? problem.message : "Unable to load vendors");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const shown = useMemo(
    () =>
      vendors.filter(
        (v) =>
          (!category || v.category === category) &&
          (!city || v.city === city) &&
          `${v.name} ${v.contactName ?? ""} ${v.phone} ${v.city}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [vendors, query, category, city],
  );
  const add = () => {
    setEditing(undefined);
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="Our vendor circle"
        subtitle="The people who bring every celebration to life."
        actions={
          <Button onClick={add}>
            <Plus className="size-4" />
            Add vendor
          </Button>
        }
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              aria-label="Search vendors"
              placeholder="Search name, phone or city"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Filter by category"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {vendorCategories.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by city"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All cities</option>
            {[...new Set(vendors.map((v) => v.city))].sort().map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </CardContent>
      </Card>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading vendors">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border p-6">
          <p className="text-destructive">{error}</p>
          <Button className="mt-3" variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : !shown.length ? (
        <EmptyState
          icon={Users}
          title={vendors.length ? "No vendors match" : "Build your vendor circle"}
          hint={vendors.length ? "Try another search or clear the filters." : "Add your first vendor and keep their contact details close."}
          action={
            <Button
              variant="outline"
              onClick={
                vendors.length
                  ? () => {
                      setQuery("");
                      setCategory("");
                      setCity("");
                    }
                  : add
              }
            >
              {vendors.length ? "Clear filters" : "Add vendor"}
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {shown.length} {shown.length === 1 ? "vendor" : "vendors"}
          </p>
          <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Backup</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link className="font-medium text-primary" href={`/vendors/${v.id}`}>
                        {v.name}
                      </Link>
                      {v.contactName && <p className="text-xs text-muted-foreground">{v.contactName}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel(v.category)}</Badge>
                    </TableCell>
                    <TableCell>{v.city}</TableCell>
                    <TableCell>
                      <a href={`tel:+91${v.phone}`}>{v.phone}</a>
                    </TableCell>
                    <TableCell>{v.backupVendor?.name ?? "Not set"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${v.name}`}
                        onClick={() => {
                          setEditing(v);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {shown.map((v) => (
              <Card key={v.id} className="overflow-hidden">
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge variant="secondary">{categoryLabel(v.category)}</Badge>
                      <Link href={`/vendors/${v.id}`} className="mt-2 block break-words font-serif text-2xl font-semibold hover:text-primary">
                        {v.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {v.city}
                        {v.contactName ? ` · ${v.contactName}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${v.name}`}
                      onClick={() => {
                        setEditing(v);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                  <a className="inline-flex items-center gap-2 text-sm" href={`tel:+91${v.phone}`}>
                    <Phone className="size-4 text-muted-foreground" />
                    {v.phone}
                  </a>
                  <div className="flex items-center justify-between gap-2 border-t pt-3 text-sm">
                    <span className="min-w-0 truncate text-muted-foreground">Backup: {v.backupVendor?.name ?? "Not set"}</span>
                    <Link href={`/vendors/${v.id}`} aria-label={`View ${v.name}`} className="inline-flex shrink-0 items-center gap-1 text-primary">
                      Profile
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      {open && <VendorForm key={editing?.id ?? "new"} vendor={editing} vendors={vendors} open={open} onOpenChange={setOpen} onSaved={() => void load()} />}
    </>
  );
}
