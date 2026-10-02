import type { ShopOwnerId } from "./shopV2";

export type Address = {
  id: string;
  ownerId: ShopOwnerId;
  name: string;
  phone: string;
  city: string;
  district: string;
  detail: string;
  label: string;
  isDefault: boolean;
};

export function createAddressId(): string {
  return `addr-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export const DEFAULT_USER_ADDRESSES: Address[] = [
  {
    id: "addr-default-you",
    ownerId: "you",
    name: "Yui",
    phone: "",
    city: "",
    district: "",
    detail: "我的家",
    label: "家",
    isDefault: true,
  },
];

export const DEFAULT_CHARACTER_ADDRESSES: Address[] = [
  {
    id: "addr-default-levi",
    ownerId: "levi",
    name: "Levi",
    phone: "",
    city: "",
    district: "",
    detail: "调查兵团宿舍 · 三楼",
    label: "宿舍",
    isDefault: true,
  },
  {
    id: "addr-default-erwin",
    ownerId: "erwin",
    name: "Erwin",
    phone: "",
    city: "",
    district: "",
    detail: "调查兵团本部 · 办公室",
    label: "本部",
    isDefault: true,
  },
];