# Decision-status occurrence index

This is a lexical navigation aid, not a replacement for contextual reading.

## LOCKED — Product

Occurrences: **4**

- L19: | **LOCKED — Product** | Hành vi hoặc nguyên tắc sản phẩm đã chốt; không được tự ý thay đổi khi triển khai. |
- L276: **LOCKED — Product + Technology**
- L576: **LOCKED — Product + Technology**
- L4444: ## 33.1. LOCKED — Product

## LOCKED — Technology

Occurrences: **12**

- L20: | **LOCKED — Technology** | Công nghệ hoặc kiến trúc nền đã được lựa chọn; thay đổi phải có ADR, prototype đối chứng và bằng chứng vượt trội. |
- L124: **LOCKED — Technology**
- L218: **LOCKED — Technology**
- L309: **LOCKED — Technology**
- L1038: **LOCKED — Technology**
- L1154: **LOCKED — Technology substrate; UX chi tiết theo đặc tả**
- L1945: **LOCKED — Technology**
- L2075: **LOCKED — Technology direction**
- L2523: **LOCKED — Technology**
- L2704: **LOCKED — Technology**
- L2998: **LOCKED — Technology; schema chi tiết cần migration design**
- L4457: ## 33.2. LOCKED — Technology

## PROTOTYPE-GATED

Occurrences: **6**

- L21: | **PROTOTYPE-GATED** | Hướng ưu tiên đã chọn nhưng phải vượt qua prototype định lượng trước khi khóa implementation cuối. |
- L60: Đây là **mô phỏng độ bền quyết định**, không phải 10 triệu lần benchmark app. Kết quả phụ thuộc ma trận điểm và phân phối bất định được công khai trong phương pháp; benchmark prototype vẫn có quyền phủ quyết ở các mục mang nhãn PROTOTYPE-GATED.
- L1384: **PROTOTYPE-GATED nhưng hướng đã khóa:**
- L2096: **PROTOTYPE-GATED:** hai schema strategy phải được thử bằng cùng fixture:
- L3184: **PROTOTYPE-GATED:**
- L4461: ## 33.3. PROTOTYPE-GATED

## OPEN — UX

Occurrences: **5**

- L22: | **OPEN — UX** | Nhu cầu hoặc phạm vi còn mở; tuyệt đối không được AI tự lấp bằng giả định. |
- L804: **OPEN — UX:** icon cuối, vị trí chính xác ở cửa sổ hẹp và mức blur overlay.
- L2648: - Library local 6–8 world ban đầu là **OPEN — UX quantity**, engine hỗ trợ registry.
- L3978: **OPEN — UX; substrate relational**
- L4008: **DEFERRED/OPEN — UX; technology foundation:**

## OPEN — Product

Occurrences: **5**

- L1668: **OPEN — Product:** chưa có actual-time tracker. Vì vậy mọi projection phải ghi rõ loại thời gian:
- L3742: **Vẫn OPEN — Product/UX:**
- L3988: **OPEN — Product role.** Nếu giữ:
- L3997: **OPEN — Product role; LOCKED — layout substrate.**
- L4470: ## 33.4. OPEN — Product/UX

## OPEN — Technology

Occurrences: **1**

- L2247: - Formula renderer chỉ thêm dependency sau khi chọn KaTeX/MathJax bằng trace riêng; hiện **OPEN — Technology**.

## DEFERRED

Occurrences: **8**

- L23: | **DEFERRED** | Có thể hữu ích nhưng chủ động để sau; không nằm trong critical path. |
- L841: Task dialog **không autosave từng ký tự vào DB**. Save là explicit atomic command. Draft recovery cho dialog chưa submit là DEFERRED, tránh tạo dữ liệu nửa vời.
- L2650: - Advanced full palette customization DEFERRED.
- L3356: Các chức năng DEFERRED không được nằm trong critical path, schema bắt buộc hoặc navigation chính.
- L3408: | Graph | DEFERRED/OPEN | Graphology + Sigma.js 3 + ForceAtlas2 worker, lazy bundle. |
- L4008: **DEFERRED/OPEN — UX; technology foundation:**
- L4560: - [x] **GRAPH-077** — Graph lazy/deferred.
- L4592: - Outline/Noteboard/tags/backlinks/graph giữ trạng thái OPEN/DEFERRED dù substrate đã chọn.

## REMOVED

Occurrences: **6**

- L24: | **REMOVED** | Đã loại khỏi sản phẩm; không được đưa trở lại thông qua dependency hoặc “tiện thể”. |
- L1074: ### Enforcement trạng thái REMOVED
- L3347: Các chức năng REMOVED phải được bảo vệ bằng dependency policy và acceptance tests. Không thêm package notification, auth, cloud SDK, collaboration CRDT hoặc telemetry “để sau dùng”. Mỗi dependency mới phải trả lời:
- L4474: ## 33.5. REMOVED
- L4583: - [x] **DOC-100** — REMOVED không quay lại qua stack.
- L4591: - Reminder/notification/sound xuất hiện trong tài liệu chỉ ở ngữ cảnh **REMOVED/cấm**, không như feature.
