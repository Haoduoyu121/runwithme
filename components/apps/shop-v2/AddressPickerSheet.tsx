"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { Address } from "@/data/address";
import type { ShopOwnerId } from "@/data/shopV2";
import { upsertAddress } from "@/lib/addressStorage";

import AddressSheet from "./AddressSheet";

type Props = {
  ownerId: ShopOwnerId;
  addresses: Address[];
  selectedId: string | null;
  onClose: () => void;
  onPick: (id: string) => void;
};

export default function AddressPickerSheet({
  ownerId,
  addresses,
  selectedId,
  onClose,
  onPick,
}: Props) {
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] =
    useState<Address | null>(null);

  return (
    <>
      <div
        className="shopv2-sheet-backdrop"
        onClick={onClose}
      >
        <div
          className="shopv2-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="shopv2-sheet-header">
            <span>选择收货地址</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
            >
              ✕
            </button>
          </header>

          {addresses.length === 0 ? (
            <div className="shopv2-empty">
              <div className="shopv2-empty-title">
                还没有地址
              </div>
            </div>
          ) : (
            <div className="shopv2-addr-list">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={
                    "shopv2-addr-item" +
                    (selectedId === a.id ? " active" : "")
                  }
                  onClick={() => onPick(a.id)}
                >
                  <div className="shopv2-addr-item-main">
                    <div className="shopv2-addr-item-name">
                      {a.name}
                      {a.phone && (
                        <span className="shopv2-addr-item-phone">
                          {a.phone}
                        </span>
                      )}
                      {a.isDefault && (
                        <span className="shopv2-addr-item-default">
                          默认
                        </span>
                      )}
                    </div>
                    <div className="shopv2-addr-item-detail">
                      {a.city}
                      {a.district
                        ? " · " + a.district
                        : ""}
                      {a.detail ? " " + a.detail : ""}
                    </div>
                  </div>
                  <span
                    className="shopv2-addr-item-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTarget(a);
                    }}
                  >
                    编辑
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="shopv2-addr-new"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} strokeWidth={2.6} />
            <span>新建地址</span>
          </button>
        </div>
      </div>

      {showNew && (
        <AddressSheet
          ownerId={ownerId}
          address={null}
          onClose={() => setShowNew(false)}
          onSave={(addr) => {
            upsertAddress(addr);
            setShowNew(false);
            onPick(addr.id);
          }}
        />
      )}

      {editTarget && (
        <AddressSheet
          ownerId={ownerId}
          address={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(addr) => {
            upsertAddress(addr);
            setEditTarget(null);
            onPick(addr.id);
          }}
        />
      )}
    </>
  );
}