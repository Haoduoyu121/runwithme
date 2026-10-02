"use client";

import {
  DEFAULT_USER_ADDRESSES,
  DEFAULT_CHARACTER_ADDRESSES,
  type Address,
} from "@/data/address";
import type { ShopOwnerId } from "@/data/shopV2";

const KEY = "runwithme_addresses_v1";
const EVT = "runwithme:addresses-updated";

function emit() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

function defaults(): Address[] {
  return [
    ...DEFAULT_USER_ADDRESSES,
    ...DEFAULT_CHARACTER_ADDRESSES,
  ];
}

export function loadAddresses(): Address[] {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaults();
    return parsed.length > 0 ? parsed : defaults();
  } catch {
    return defaults();
  }
}

export function saveAddresses(list: Address[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    emit();
  } catch (e) {
    console.error("保存地址失败:", e);
  }
}

export function loadAddressesByOwner(
  ownerId: ShopOwnerId
): Address[] {
  return loadAddresses().filter((a) => a.ownerId === ownerId);
}

export function getDefaultAddress(
  ownerId: ShopOwnerId
): Address | null {
  const list = loadAddressesByOwner(ownerId);
  return list.find((a) => a.isDefault) ?? list[0] ?? null;
}

export function upsertAddress(addr: Address): void {
  const list = loadAddresses();
  const idx = list.findIndex((a) => a.id === addr.id);
  let next: Address[];

  if (idx >= 0) {
    next = list.map((a) => (a.id === addr.id ? addr : a));
  } else {
    next = [...list, addr];
  }

  /* 该 owner 只能有一个 default */
  if (addr.isDefault) {
    next = next.map((a) =>
      a.ownerId === addr.ownerId && a.id !== addr.id
        ? { ...a, isDefault: false }
        : a
    );
  }

  saveAddresses(next);
}

export function deleteAddress(id: string): void {
  const list = loadAddresses().filter((a) => a.id !== id);
  saveAddresses(list);
}

export const ADDRESS_EVENT = EVT;