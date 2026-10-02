"use client";

import { useState } from "react";
import { X } from "lucide-react";

import {
  createAddressId,
  type Address,
} from "@/data/address";
import type { ShopOwnerId } from "@/data/shopV2";

type Props = {
  ownerId: ShopOwnerId;
  /** null = 新建 */
  address: Address | null;
  onClose: () => void;
  onSave: (addr: Address) => void;
  onDelete?: () => void;
};

export default function AddressSheet({
  ownerId,
  address,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState(address?.name ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [district, setDistrict] = useState(
    address?.district ?? ""
  );
  const [detail, setDetail] = useState(
    address?.detail ?? ""
  );
  const [label, setLabel] = useState(
    address?.label ?? "家"
  );
  const [isDefault, setIsDefault] = useState(
    address?.isDefault ?? false
  );

  function handleSave() {
    if (!detail.trim()) {
      window.alert("请填写详细地址");
      return;
    }
    onSave({
      id: address?.id ?? createAddressId(),
      ownerId,
      name: name.trim() || "收货人",
      phone: phone.trim(),
      city: city.trim(),
      district: district.trim(),
      detail: detail.trim(),
      label: label.trim() || "家",
      isDefault,
    });
  }

  return (
    <div
      className="shopv2-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="shopv2-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shopv2-sheet-header">
          <span>{address ? "编辑地址" : "新建地址"}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </header>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">收件人</div>
          <input
            type="text"
            className="shopv2-addr-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="收货人姓名"
            maxLength={20}
          />
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">
            手机号（可选）
          </div>
          <input
            type="tel"
            className="shopv2-addr-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="可不填"
            maxLength={20}
          />
        </div>

        <div className="shopv2-addr-row">
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">城市</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="城市"
              maxLength={20}
            />
          </div>
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">区/县</div>
            <input
              type="text"
              className="shopv2-addr-input"
              value={district}
              onChange={(e) =>
                setDistrict(e.target.value)
              }
              placeholder="区/县"
              maxLength={20}
            />
          </div>
        </div>

        <div className="shopv2-addr-field">
          <div className="shopv2-addr-label">
            详细地址
          </div>
          <textarea
            className="shopv2-addr-textarea"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="街道、门牌号、楼层等"
            rows={2}
            maxLength={80}
          />
        </div>

        <div className="shopv2-addr-row">
          <div className="shopv2-addr-field" style={{ flex: 1 }}>
            <div className="shopv2-addr-label">
              标签
            </div>
            <div className="shopv2-addr-labels">
              {["家", "公司", "学校", "其他"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={
                    "shopv2-addr-label-chip" +
                    (label === l ? " active" : "")
                  }
                  onClick={() => setLabel(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="shopv2-addr-default">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) =>
              setIsDefault(e.target.checked)
            }
          />
          <span>设为默认地址</span>
        </label>

        <div className="shopv2-addr-actions">
          {onDelete && (
            <button
              type="button"
              className="shopv2-addr-btn danger"
              onClick={() => {
                if (window.confirm("删除这个地址？"))
                  onDelete();
              }}
            >
              删除
            </button>
          )}
          <button
            type="button"
            className="shopv2-addr-btn primary"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}