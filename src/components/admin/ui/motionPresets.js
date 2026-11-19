// Hiệu ứng dùng chung cho danh sách: dòng mới trượt vào, dòng bị xoá thu lại.
export const listItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -24, transition: { duration: 0.18 } },
  transition: { type: "spring", stiffness: 420, damping: 34 },
};

// Dòng bảng: không dùng layout (thẻ <tr> đổi kích thước dễ giật), chỉ mờ + trượt.
export const tableRow = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, transition: { duration: 0.15 } },
  transition: { duration: 0.22, ease: "easeOut" },
};
