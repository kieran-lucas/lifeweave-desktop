# SIÊU ĐẶC TẢ TÍCH HỢP SẢN PHẨM – GIAO DIỆN – CÔNG NGHỆ
## Ứng dụng desktop Windows local-first: Task System + Life System

> **Vai trò:** Single Source of Truth cấp sản phẩm và kiến trúc trước khi lập trình.  
> **Ngày hợp nhất:** 01/08/2026 — múi giờ Asia/Bangkok.  
> **Nguồn nền:** Bản đặc tả sản phẩm 2.465 dòng ngày 01/08/2026, toàn bộ quyết định công nghệ Nhóm 1–5 trong cuộc trò chuyện, và xác minh lại bằng tài liệu chính thức.  
> **Mục tiêu:** Không còn một “bản UI” và một “bản công nghệ” tách rời. Mỗi khu vực sản phẩm trong tài liệu này đồng thời quy định ý định UX, bố cục, trạng thái, dữ liệu, công nghệ thực hiện, hiệu năng, accessibility, kiểm thử và tiêu chí nghiệm thu.  
> **Phạm vi:** Đặc tả và kiến trúc; chưa phải mã nguồn, schema SQL cuối cùng hay bộ asset thương hiệu cuối cùng.

---

# 0. Quản trị tài liệu và phương pháp ra quyết định


## Quy ước trạng thái quyết định

| Nhãn | Ý nghĩa bắt buộc |
|---|---|
| **LOCKED — Product** | Hành vi hoặc nguyên tắc sản phẩm đã chốt; không được tự ý thay đổi khi triển khai. |
| **LOCKED — Technology** | Công nghệ hoặc kiến trúc nền đã được lựa chọn; thay đổi phải có ADR, prototype đối chứng và bằng chứng vượt trội. |
| **PROTOTYPE-GATED** | Hướng ưu tiên đã chọn nhưng phải vượt qua prototype định lượng trước khi khóa implementation cuối. |
| **OPEN — UX** | Nhu cầu hoặc phạm vi còn mở; tuyệt đối không được AI tự lấp bằng giả định. |
| **DEFERRED** | Có thể hữu ích nhưng chủ động để sau; không nằm trong critical path. |
| **REMOVED** | Đã loại khỏi sản phẩm; không được đưa trở lại thông qua dependency hoặc “tiện thể”. |

Khi có xung đột, thứ tự ưu tiên là: **product invariant → dữ liệu và an toàn → accessibility → performance → visual quality → developer convenience**. Riêng trong các phương án đều đáp ứng an toàn tối thiểu, chất lượng chuyển động, độ mượt và độ chính xác layout được ưu tiên rất cao.


## 0.1. Mười lượt trace độc lập đã thực hiện

1. **Audit tầm nhìn và invariants:** local-first, offline, task-first, Task không phải card, Life System không phải Notion clone.
2. **Audit kiến trúc thông tin:** Today mặc định, sidebar, Calendar, Analytics, Life System, Settings và đường đi ngắn nhất.
3. **Audit visual/layout:** typography, icon, spacing, scroll ownership, DPI, theme contracts và responsive window.
4. **Audit motion:** microinteraction, shared-element, reflow cây, radial fan, scene reveal, ambient motion và Reduced Motion.
5. **Audit dữ liệu:** SQLite, transaction, migration, archive/history, recurrence, aggregate và backup/restore.
6. **Audit editor/content:** Tiptap/ProseMirror, scene/block schema, Read Mode tĩnh, Markdown import/export và sanitization.
7. **Audit interaction phức tạp:** dnd-kit, d3-hierarchy, virtualization, time wheel, collision/edge handling và keyboard parity.
8. **Audit search/graph/derived views:** FTS5, filter AST, backlinks, tags, saved views, Graphology/Sigma và trạng thái OPEN của phạm vi UX.
9. **Audit chất lượng vận hành:** accessibility, privacy, security capabilities, CSP, logging, crash recovery và performance budgets.
10. **Audit phát hành:** test pyramid, Windows E2E, visual regression, NSIS/WebView2, code signing, update policy và CI/release.

## 0.2. Mô phỏng quyết định 10 × 1.000.000 vòng

Mười vòng Monte Carlo thực tế đã được chạy, mỗi vòng 1.000.000 mẫu trọng số. Mô hình thay đổi trọng số và sai số đánh giá quanh 10 tiêu chí: độ mượt, motion, quyền kiểm soát thị giác, độ chính xác layout, local-first, an toàn dữ liệu, accessibility, maintainability, hệ sinh thái và startup/memory.

| Vòng | Tỷ lệ stack được chọn thắng |
|---:|---:|
| 1 | 99,2202% |
| 2 | 99,6537% |
| 3 | 99,6506% |
| 4 | 99,6061% |
| 5 | 99,7479% |
| 6 | 99,5187% |
| 7 | 99,6401% |
| 8 | 99,3588% |
| 9 | 99,6895% |
| 10 | 99,6110% |
| **Trung bình** | **99,56966%** |

Đây là **mô phỏng độ bền quyết định**, không phải 10 triệu lần benchmark app. Kết quả phụ thuộc ma trận điểm và phân phối bất định được công khai trong phương pháp; benchmark prototype vẫn có quyền phủ quyết ở các mục mang nhãn PROTOTYPE-GATED.

## 0.3. Chính sách phiên bản

- Khóa **major/minor đã xác minh**; patch cụ thể được pin trong `pnpm-lock.yaml` và `Cargo.lock`.
- Không ghi `latest` trong manifest production.
- Nâng dependency theo batch nhỏ, có changelog review, build, test, screenshot và performance comparison.
- **React 19.2** và **TypeScript 6.0 strict** đã được xác minh tại thời điểm tài liệu.
- **Vite:** quyết định cũ 8.1 được điều chỉnh thành **Vite 8.x, pin nhánh ổn định được hỗ trợ mới nhất khi bootstrap**; tại 01/08/2026, nhánh regular patches là 8.2 và 8.1 chỉ còn backport quan trọng. Không giữ 8.1 chỉ vì lịch sử hội thoại.
- **Tauri:** Tauri 2.x; pin patch tương thích giữa Rust crate, CLI và JS API.
- Mọi thay đổi major/minor sau khi bắt đầu implementation phải có ADR.

## 0.4. Stack chuẩn hợp nhất

```text
Desktop runtime        Tauri 2.x + Windows WebView2 Evergreen
Frontend               React 19.2 + TypeScript 6.0 strict + Vite 8.x
Rust core              Rust stable + application/domain/infrastructure layers
IPC                    Tauri Commands + Channels + Events + ts-rs DTO bindings
Persistence            rusqlite bundled + dedicated DB worker + WAL
Migration              rusqlite_migration, forward-only, immutable releases
Styling                 vanilla-extract + theme contracts + Sprinkles + native CSS
UI primitives          Radix Primitives + selective React Aria + Floating UI
Motion                  Motion for React + CSS + selective Web Animations API
Typography              Inter Variable + Source Serif 4 Variable + JetBrains Mono
Icons                   Phosphor Icons + custom SVG registry
Color                   OKLCH semantic tokens + build-time Culori validation
State                   TanStack Query + Zustand + local React state
Editor                  Tiptap/ProseMirror + Static Renderer
Markdown                unified/remark/rehype pipeline
Drag/drop               dnd-kit
Tree geometry           d3-hierarchy + HTML nodes + SVG connectors
Virtualization          TanStack Virtual, selectively applied
Search                  SQLite FTS5 + normalized Vietnamese shadow fields
Recurrence              RFC 5545 model + Rust rrule + monthly expansion
Graph foundation        Graphology + Sigma.js 3 + ForceAtlas2 Web Worker
Testing                 Vitest, RTL, Browser Mode, Rust tests, nextest, proptest
Desktop E2E             WebdriverIO + @wdio/tauri-service
Visual regression       Playwright deterministic Windows baselines
Packaging               Tauri NSIS installer + WebView2 offline fallback
Release                 Signed installer, GitHub Actions/tauri-action, GitHub Releases
```

## 0.5. Nguyên tắc chống “implementation lấn át sản phẩm”

- Dependency không được tự sinh ra một màn hình hoặc workflow chỉ vì thư viện hỗ trợ.
- Không dùng component mặc định chưa restyle trong production.
- Không dùng editor schema để ép người dùng tư duy theo cấu trúc của framework.
- Không dùng graph engine để biến Life System thành graph-first.
- Không dùng recurrence library để thêm reminder hoặc notification đã bị loại.
- Không dùng TanStack Query như nguồn sự thật thứ hai; SQLite/Rust domain vẫn là authority.
- Không dùng Zustand chứa bản sao lâu dài của toàn bộ card/task.
- Không dùng animation library để animate mọi thứ; motion phải có hierarchy và budget.

---

# PHẦN I — ĐẶC TẢ TÍCH HỢP THEO KHU VỰC SẢN PHẨM

> Phần dưới giữ nguyên mọi quyết định sản phẩm có giá trị từ bản đặc tả gốc, đồng thời chèn ngay bên cạnh hợp đồng kỹ thuật, dữ liệu, hiệu năng, accessibility và kiểm thử tương ứng.

# 1. Tầm nhìn sản phẩm

### Hợp đồng kiến trúc đi kèm tầm nhìn

**LOCKED — Technology**

Sản phẩm được hiện thực bằng mô hình **React UI + Rust application core**, không phải ứng dụng web đóng gói đơn thuần và cũng không phải native UI toolkit thuần Rust. Tauri chỉ là host/runtime và security boundary; business logic quan trọng không nằm trong component React.

```text
Người dùng
  ↓
React interaction + Motion
  ↓ typed command
Tauri IPC boundary
  ↓
Rust application service
  ↓
Domain validation + transaction
  ↓
Repository / SQLite / filesystem
  ↓
Typed result + invalidation hints
  ↓
TanStack Query + ephemeral UI state
```

Mỗi trụ cột có profile render riêng:

| Trụ cột | Profile kỹ thuật |
|---|---|
| Task | DOM đơn giản, row/timeline, ít layer, phản hồi dưới một frame bằng optimistic UI, motion ngắn. |
| Life Browse | HTML card nét + SVG connector + shared-element transition; số node hữu hạn trên màn hình. |
| Life Edit | d3-hierarchy tính hình học, dnd-kit tương tác, Motion reflow, selective virtualization. |
| Narrative Reader | Static Renderer, lazy scene, asset local, ambient transform/opacity có giới hạn. |
| Narrative Studio | Tiptap active editor, scene/block DnD, không mount đồng thời editor nặng ngoài viewport. |

Kiến trúc phải giữ được hai cảm xúc khác nhau mà không tách thành hai ứng dụng: cùng token system, typography roles, icon grammar, command system và persistence; khác mật độ, motion choreography và visual atmosphere.


## 1.1. Định nghĩa ngắn gọn

Đây là một ứng dụng desktop Windows **local-first**, hoạt động hoàn toàn offline, kết hợp hai năng lực cốt lõi:

1. **Task System:** hệ thống lập kế hoạch và đánh giá những việc cần làm hằng ngày.
2. **Life System:** hệ thống dạng cây để tổ chức định hướng, nguyên tắc, mục tiêu và những điều cần tập trung trong từng lĩnh vực cuộc sống.

Ứng dụng lấy cảm hứng mạnh từ cảm giác sử dụng Supernotes, đặc biệt là sự sạch sẽ, trực quan và tổ chức nội dung theo card, nhưng **không phải bản sao Supernotes**. Sản phẩm phải có thiết kế và nhận diện riêng, đơn giản hơn về phạm vi, tập trung vào trải nghiệm cá nhân offline.

## 1.2. Định hướng trải nghiệm

### Ma trận trải nghiệm → quyết định kỹ thuật

| Thuộc tính | Task | Life System | Hệ quả implementation |
|---|---|---|---|
| Tần suất | Nhiều lần/ngày | Thỉnh thoảng | Task route/preload trước; Canvas và Graph lazy import. |
| Mật độ | Gọn, đọc nhanh | Thoáng, cinematic có kiểm soát | Hai density profile trên cùng spacing scale. |
| Motion | 150–400 ms | 300–800 ms + ambient dài | Motion tokens phân tầng, không hard-code duration. |
| Rendering | Row/table-like DOM | Layered scene + card + SVG | Tách renderer theo mode, không dùng một mega-component. |
| Data | Task/time/assessment | Tree/document/scene/block | Aggregate và command boundary riêng. |
| Failure tolerance | Không được mất task | Không được hỏng document | Transaction, autosave, versioned document schema và recovery. |

**Chỉ số cảm nhận bắt buộc:** thao tác Task phải “instant” dù commit SQLite vẫn đang chạy; Life transition phải giữ continuity nhưng không block input hoặc scroll.


Ứng dụng phải tạo được hai trạng thái cảm xúc khác nhau nhưng thống nhất:

- **Task:** nhanh, sạch, kỷ luật, rõ ràng, ít ma sát, dùng nhiều lần mỗi ngày.
- **Life System:** giàu cảm xúc, có chiều sâu, ấn tượng thị giác, giống bước vào một “hệ thống tư duy cá nhân”.

## 1.3. Tần suất sử dụng

- Task được dự kiến mở **hằng ngày và nhiều lần trong ngày**.
- Life System chỉ được mở khi cần xem lại, điều chỉnh hoặc đào sâu định hướng.
- Vì vậy Task phải là khu vực ưu tiên điều hướng và là màn hình mặc định.
- Life System vẫn là một trong hai trụ cột chiến lược nhưng không chiếm vị trí điều hướng ngang hàng theo tần suất sử dụng.

---

# 2. Phạm vi và nguyên tắc bất biến

### Enforcement ở cấp repo

Các invariant không chỉ nằm trong tài liệu. Chúng phải được mã hóa bằng:

- `AI_CONSTITUTION.md`: invariant sản phẩm và những tính năng cấm.
- ADR: mọi thay đổi kiến trúc lớn.
- Cargo/TypeScript module boundaries.
- Test “no network at runtime”.
- Capability files của Tauri theo window.
- Dependency review checklist.
- Schema constraints và Rust validation.
- Acceptance test cho Task không tạo card, reminder không tồn tại và Today là route mặc định.


## 2.1. Nền tảng

### Nền tảng kỹ thuật đã khóa sau xác minh

**LOCKED — Technology**

- Tauri 2.x.
- React 19.2.
- TypeScript 6.0 với `strict: true` và các strict flags không bị tắt cục bộ tùy tiện.
- Vite 8.x, pin nhánh ổn định được hỗ trợ mới nhất lúc bootstrap; không cố định 8.1 đã bị supersede.
- Rust stable, edition hiện hành tương thích với Tauri 2.
- SQLite được bundle qua `rusqlite` để tránh phụ thuộc SQLite hệ thống.
- Package manager frontend: **pnpm** với lockfile committed.
- Build target đầu tiên: Windows x64; ARM64 là compatibility target sau khi x64 ổn định.

### Ranh giới React – Rust

**React sở hữu:**

- component tree, focus, selection, hover, drag visual;
- animation và render choreography;
- editor instance trong Studio Mode;
- cached projections, session state và optimistic state;
- layout measurement chỉ khi CSS không đủ.

**Rust sở hữu:**

- validation có ý nghĩa nghiệp vụ;
- persistence, migration, backup, restore và filesystem;
- recurrence expansion và time conflict authority;
- search query execution;
- aggregate update;
- undo inverse command cho domain mutation;
- security-sensitive path handling;
- diagnostic export.

### IPC contract

- Commands cho request/response và mutation.
- Channels cho progress dài như backup/import/export.
- Events chỉ dùng cho broadcast hiếm: database restored, theme asset cache invalidated, window lifecycle.
- DTO Rust sinh TypeScript bằng `ts-rs`; không hand-copy interface.
- IPC wrapper tập trung trong `frontend/src/ipc/`; component không gọi `invoke()` trực tiếp.
- Error trả về typed error code + safe message; không leak SQL/path nội bộ.


- Ứng dụng desktop cho Windows.
- Stack định hướng:
  - Tauri 2.
  - React.
  - TypeScript.
  - SQLite.
- Chạy hoàn toàn offline.
- Không cần tài khoản.
- Không phụ thuộc server.
- Không giới hạn số lượng card bởi logic sản phẩm.
- Dữ liệu dễ backup, restore và xuất ra định dạng dễ tiếp cận.

## 2.2. Nguyên tắc local-first

### Local-first ở mức runtime

**LOCKED — Product + Technology**

- Runtime production không cần network để mở, đọc, tạo, sửa, search, analytics, backup hoặc restore.
- Không nhúng Google Fonts, CDN icon, remote background, telemetry SDK hoặc analytics beacon.
- CSP mặc định `default-src 'self'`; quyền network không cấp nếu feature không cần.
- Visual assets đóng gói trong application bundle; user assets nằm trong app data directory.
- Mọi dữ liệu chính nằm trong SQLite hoặc filesystem được SQLite tham chiếu.
- Backup gồm database snapshot nhất quán, asset originals, manifest, checksums và version metadata.
- Update không tự check nền. Bản đầu dùng installer tải thủ công; mọi online check tương lai phải opt-in rõ ràng.
- Test CI phải bắt được request ngoài allowlist ở production build.

### Nguyên tắc durability

- SQLite WAL.
- `foreign_keys=ON` trên mọi connection.
- `synchronous=NORMAL` mặc định cho cân bằng autosave; thao tác backup/migration dùng quy trình durability mạnh hơn.
- Dedicated DB worker tuần tự hóa write commands.
- Không copy trực tiếp file SQLite đang mở để backup; dùng Online Backup API.
- Restore thực hiện khi database chính đã đóng, qua staging + integrity check + atomic replacement.


- Toàn bộ dữ liệu người dùng được lưu cục bộ.
- Không có cloud sync mặc định.
- Không yêu cầu đăng nhập.
- Không có collaboration, workspace nhiều người hoặc phân quyền.
- Không có telemetry hoặc network request ngầm trong runtime.
- Backup phải là một chức năng hạng nhất, không phải phần phụ.
- Import/export Markdown vẫn là một năng lực nền tảng của tầm nhìn ban đầu.

## 2.3. Nguyên tắc thiết kế

### Design system enforcement

**LOCKED — Technology**

- `vanilla-extract` sinh CSS tĩnh.
- `createThemeContract` định nghĩa contract bắt buộc cho light/dark và visual worlds.
- Sprinkles chỉ cung cấp utility đã giới hạn; cấm arbitrary pixel values trong feature code trừ exception được ghi ADR.
- Native CSS Grid/Flex/Container Queries quản lý layout; JavaScript không được làm layout engine cho app shell.
- Semantic tokens thay vì primitive trực tiếp trong component.
- Component primitives nội bộ bọc Radix/React Aria; feature code không phụ thuộc trực tiếp API của nhiều thư viện.
- Mọi UI state được biểu diễn bằng `data-*`, ARIA và semantic component props; không suy diễn từ class name.

### Các scale tối thiểu

- spacing scale;
- typography scale;
- radius scale;
- border/stroke scale;
- elevation/material scale;
- z-index layer scale;
- duration/easing/spring scale;
- responsive container thresholds;
- focus ring contract;
- density profiles.

Layout review phải phát hiện: nested scroll ngoài chủ đích, hard-coded width phá DPI, line lệch nửa pixel, icon baseline sai, arbitrary z-index và overflow che radial fan.


- Tối giản nhưng không nhạt nhòa.
- Đẹp, mượt và có nhận diện riêng.
- Nhiều khoảng thở.
- Thao tác nhanh.
- Không hiển thị dữ liệu chỉ vì “có thể hiển thị”.
- Mỗi màn hình phải có một mục tiêu rõ ràng.
- Không biến ứng dụng thành dashboard dày đặc số liệu.
- Không sao chép nguyên xi Supernotes.
- Không xây tính năng chỉ vì Supernotes có tính năng đó.
- Ưu tiên những chức năng thực sự cần cho một cá nhân dùng local.

## 2.4. Phạm vi của giai đoạn hiện tại

Đoạn chat và tài liệu này tập trung vào:

- Thiết kế giao diện.
- Quy định tính năng.
- Bố cục.
- Luồng thao tác.
- Trạng thái.
- Animation.
- Cách thức hoạt động.
- Mối quan hệ giữa các phần.

Chưa bắt đầu:

- Viết mã.
- Chốt schema kỹ thuật cuối cùng.
- Chốt công thức thuật toán điểm.
- Chốt component implementation.
- Chốt toàn bộ asset và brand identity cuối cùng.

---

# 3. Hai trục sản phẩm cốt lõi

### Domain separation

Task và Life System liên hệ ở ý nghĩa nhưng tách aggregate kỹ thuật:

```text
Task aggregate
- Task
- TimeSlotGroup
- Category
- CompletionEvaluation
- RecurrenceSeries / OccurrenceOverride

Life aggregate
- LifeNode
- ReaderDocument
- Scene
- ContentBlock
- BranchTheme
```

Không có foreign key bắt buộc khiến task phải thuộc Life Node. Liên kết mềm trong tương lai chỉ được thêm khi UX được chốt. Nhờ đó xóa/restructure Life tree không phá lịch sử Task.


## 3.1. Task System

Task System là hệ điều hành cho từng ngày.

Nó trả lời:

- Hôm nay cần làm gì?
- Làm vào lúc nào?
- Thuộc lĩnh vực nào?
- Mức độ quan trọng ra sao?
- Sau khi làm xong, kết quả thực tế tốt đến mức nào?
- Tuần này đã dành bao nhiêu thời gian cho từng lĩnh vực?
- Có đang đạt ngưỡng tối thiểu và mục tiêu dài hạn hay không?

## 3.2. Life System

Life System là bản đồ định hướng cuộc sống.

Nó trả lời:

- Điều gì đang quan trọng?
- Mỗi lĩnh vực cần tập trung vào đâu?
- Có những nguyên tắc nào phải nhớ?
- Có những điều gì cần tránh?
- Mục tiêu, định hướng và cấu trúc tư duy hiện tại là gì?
- Các nhánh như học tập, sự nghiệp, tiền bạc, sức khỏe, tình yêu được tổ chức ra sao?

Ví dụ cây khái niệm:

```text
Cuộc sống
├── Học tập
│   ├── Đại học
│   ├── Tiếng Anh
│   └── Nghiên cứu
├── Sự nghiệp
├── Tiền bạc
├── Sức khỏe
├── Tình yêu
└── Các lĩnh vực khác
```

## 3.3. Quan hệ giữa hai trục

- Life System trả lời: **Tôi đang hướng đến điều gì?**
- Task trả lời: **Hôm nay tôi cần làm gì để tiến gần đến điều đó?**

Tuy có liên hệ về mặt ý nghĩa, hai phần không bị trộn lẫn về mô hình giao diện:

- Task không dùng card.
- Life System dùng cây card.
- Task là dữ liệu hành động hằng ngày.
- Life System là dữ liệu định hướng và nội dung dài hạn.

---

# 4. Kiến trúc thông tin và điều hướng toàn ứng dụng

### App shell implementation contract

- Một main window ở phiên bản đầu.
- React Router hoặc router mỏng nội bộ chỉ quản lý destination; route không được biến thành nguồn sự thật của domain data.
- App shell dùng CSS Grid: sidebar + content; auxiliary overlay dùng portal layer.
- Một scroll owner rõ cho mỗi destination.
- Sidebar state nằm trong Zustand session store và được persist cục bộ có version.
- Today bundle được preload; Graph, Narrative Studio và export renderer lazy-loaded.
- Error Boundary theo destination để lỗi Canvas không làm sập Task.
- Mọi route có focus restoration và landmark semantics.

### Layer contract

```text
0  base/background
10 content
20 sticky headers/current-time line
30 floating local controls
40 popovers/radial fan
50 modal overlay/dialog
60 command palette
70 system-critical recovery dialog
```

Không dùng z-index tùy ý ngoài contract.


## 4.1. Bố cục app shell

### Kích thước và responsiveness

- Sidebar expanded token: 220 px nominal, clamp trong khoảng 210–230 px.
- Collapsed rail: 68 px nominal, clamp 64–72 px.
- Main content `min-width: 0` để tránh overflow Grid.
- Window minimum size chỉ khóa sau prototype DPI; không giả định 1280×720 duy nhất.
- Container query điều chỉnh mật độ trong destination thay vì global breakpoint dựa viewport.
- Khi cửa sổ hẹp: sidebar rail trước, giảm outer gutter sau, cuối cùng mới thay đổi cấu trúc hàng Task.
- Không biến desktop app thành mobile bottom navigation.

### Scroll ownership

- App root không cuộn.
- Destination viewport sở hữu cuộn chính.
- Modal có scroll riêng nhưng khóa background scroll.
- Reader có một continuous scroll container; scene không tạo nested scroll trừ table/code thật sự cần.
- Tree Edit có viewport cuộn riêng, connector overlay bám cùng coordinate space.


Sidebar cố định bên trái là cấu trúc điều hướng chính.

Thứ tự đề xuất đã được chốt theo tần suất:

1. **Today**
2. **Calendar**
3. **Analytics**
4. Đường phân cách
5. **Life System**
6. Đường phân cách
7. **Settings**
8. **Backup** có thể nằm trong Settings hoặc được truy cập rõ ràng từ khu vực cuối sidebar.

## 4.2. Màn hình mặc định

- Ứng dụng mở vào **Today**.
- Không mở vào dashboard trung gian.
- Không bắt người dùng chọn Task hay Life System trước.
- Nếu ứng dụng vừa được đóng và mở lại trong một khoảng ngắn, có thể cân nhắc nhớ màn hình trước đó; mặc định thiết kế vẫn là Today.

## 4.3. Sidebar

### Component và trạng thái

- Sidebar xây bằng component nội bộ trên semantic `nav`.
- Tooltip cho icon ở rail dùng Radix Tooltip.
- Active indicator dùng Motion `layoutId`, nhưng transform không làm mờ glyph.
- Collapse/expand animate width ở outer shell có kiểm soát; ưu tiên transform/clip nếu benchmark cho thấy width animation gây layout cost.
- Keyboard: Tab đi vào navigation; arrow navigation chỉ dùng nếu pattern được triển khai đúng như composite widget.
- Trạng thái tự thu khi vào Life System không ghi đè preference của Task; lưu hai state: `taskSidebarMode` và `lifeAutoCollapsed`.

### Acceptance

- Không layout shift khi tooltip mở.
- Không mất focus khi sidebar collapse.
- Tên destination luôn có accessible name ở rail.
- Trở về Task khôi phục đúng trạng thái trước đó.


- Có trạng thái mở rộng và thu gọn.
- Khi mở rộng: khoảng 210–230 px.
- Khi thu gọn: rail icon khoảng 64–72 px.
- Không đưa category như Tiếng Anh, Lab, Code, Thể thao vào sidebar.
- Category là dữ liệu nội bộ của Task, không phải destination cấp ứng dụng.
- Khi vào Life System, sidebar có thể tự thu gọn để dành không gian cho cây.
- Khi quay về Task, sidebar phục hồi trạng thái trước đó.

## 4.4. Life System nhớ vị trí

### Persistence contract

Lưu `last_life_node_id`, `last_life_mode`, breadcrumb/path version và optional viewport anchor trong session preference table. Khi node bị xóa/archive:

1. thử parent gần nhất;
2. nếu không tồn tại, về Life root;
3. không hiển thị blank screen;
4. ghi diagnostic event không chứa nội dung node.


- Life System ghi nhớ node cuối cùng người dùng đang đứng.
- Khi quay lại, mở đúng vị trí đó.
- Không tự động quay về root sau mỗi lần rời khỏi Life System.

## 4.5. Điều hướng Today và Calendar

- Today là view dùng hằng ngày.
- Calendar là view theo tháng.
- Từ Calendar, bấm một ngày để mở timeline của ngày đó.
- Không tạo task trực tiếp từ ô tháng; phải mở ngày trước rồi mới tạo.

---

# 5. Hệ thống Task

### Kiến trúc feature Task

**LOCKED — Product + Technology**

Task là aggregate độc lập, render bằng row/timeline, không qua Tiptap và không tạo Life card. Feature module đề xuất:

```text
features/task/
├── domain-types.ts          # generated DTO aliases + UI projections
├── queries.ts               # TanStack Query definitions
├── commands.ts              # typed frontend command adapters
├── today/
├── editor-dialog/
├── time-wheel/
├── completion-fan/
└── accessibility/

src-tauri/src/task/
├── domain.rs
├── service.rs
├── repository.rs
├── recurrence.rs
├── conflict.rs
└── dto.rs
```

### Data flow một mutation

1. React tạo optimistic projection với temporary operation ID.
2. IPC command gửi payload đã parse cơ bản.
3. Rust validate title/date/time/category/priority/recurrence/conflict.
4. Một transaction ghi Task, TimeSlotGroup, recurrence/override và audit metadata cần thiết.
5. Service trả TaskProjection + query invalidation hints + undo token.
6. Frontend reconcile optimistic item theo stable ID.
7. Lỗi thì rollback snapshot và focus đúng field.

Không animation nào phải chờ SQLite commit để bắt đầu, nhưng UI không được báo thành công vĩnh viễn trước khi command trả về.


## 5.1. Task không phải card

### DOM và visual contract

- Container chính dùng semantic list/table-like structure tùy kết quả accessibility prototype; không dùng hàng loạt `article` card có shadow.
- Mỗi row chỉ có một background layer cho hover/selected; divider là border hoặc pseudo-element dùng token.
- Không dùng Radix Card vì Radix không có card primitive và vì bản chất không phải card.
- Row height là content-driven; title/mô tả không cắt mặc định.
- Virtualization chỉ bật khi dataset của view vượt threshold đã benchmark; ngày thông thường render trực tiếp để giữ semantics đơn giản.


Đây là quyết định bất biến:

- Task **không dùng card**.
- Không tạo card phụ khi tạo task.
- Task được trình bày như một hàng trong một bảng/timeline liền mạch.
- Toàn bộ ngày là một trang liên tục, chia theo buổi.

## 5.2. Cấu trúc ngày

### Time domain contract

- Lưu ngày theo local calendar date, không biến thành UTC midnight.
- Lưu start/end theo số phút từ đầu ngày hoặc local time type chuẩn hóa; không lưu string tùy ý.
- `04:00 ≤ start < end ≤ 24:00`.
- 24:00 chỉ được dùng như end boundary; không phải start time của ngày kế.
- Mọi rule được validate ở Rust và mirror ở frontend để phản hồi sớm.
- Timezone ID lưu trong settings/series để future-proof, nhưng Task một ngày vẫn giữ local-date semantics.

Các mốc Sáng/Chiều/Tối là presentation/domain constants có version; nếu thay đổi sau này phải migration hoặc giữ semantics lịch sử rõ ràng.


Một ngày hoạt động được chia thành:

- **Sáng:** 04:00–12:00.
- **Chiều:** 12:00–18:00.
- **Tối:** 18:00–24:00.

Khoảng 00:00–04:00:

- Không cho lập task.
- Không tạo thêm vùng “Khuya”.
- Không tính là phần của “Tối” trong hệ thống Task.

## 5.3. Timeline liên tục

### Layout implementation

- Một vertical flow, không absolute-position task theo pixel thời gian như calendar scheduler.
- Section background Sáng/Chiều/Tối dùng pseudo/background token với contrast thấp.
- Sticky section label chỉ dùng nếu không che current-time line và được prototype chứng minh hữu ích.
- Auto-scroll Today dùng measured anchor gần current time, chừa preview offset cho task sắp tới.
- Current time update tối đa một lần/phút; không requestAnimationFrame loop.
- Khi tab/window ẩn, timer dừng; khi visible, tính lại từ system clock.


- Không dùng ba tab Sáng/Chiều/Tối.
- Không dùng ba cột ngang.
- Không dùng ba panel độc lập.
- Dùng một timeline dọc liên tục.
- Các buổi là những vùng nền rất nhẹ và có nhãn.
- Ranh giới buổi chỉ cần vừa đủ nhận biết, không chia cắt mạnh.
- Mục tiêu là cảm nhận ngày như một dòng thời gian liên tục.

## 5.4. Bố cục một hàng task

### Grid contract của TaskRow

```text
grid-template-columns:
  [time] minmax(92px, 116px)
  [content] minmax(0, 1fr)
  [assessment] 44px
```

Giá trị cuối phải đi qua token/prototype, nhưng nguyên tắc bắt buộc:

- cột time căn số tabular;
- content `min-width: 0`;
- assessment hit target tối thiểu phù hợp accessibility;
- task group dùng cùng grid để đường cột thẳng tuyệt đối;
- icon category nằm trong content lead, không tạo cột mới thay đổi alignment;
- priority marker không làm title nhảy ngang giữa các row.

### Render performance

- `TaskRow` nhận projection đã chuẩn bị; không tự query.
- Selector Zustand/TanStack Query phải granular.
- Memoization chỉ thêm sau profiler; không bọc `memo` đại trà.
- Hover state bằng CSS, không global store.


Mỗi task là một hàng với đường phân cách nhẹ:

```text
08:00–10:00 │ [icon category] Nội dung task + mô tả │ ○ đánh giá
```

Ba cột chính:

### Cột trái — thời gian

#### Typography và accessibility

- Inter Variable với `font-variant-numeric: tabular-nums`.
- Accessible label đọc “từ 08 giờ 00 đến 10 giờ 00”, không phụ thuộc dấu gạch thị giác.
- Time group chỉ đọc một lần khi nhiều task cùng slot; mỗi task vẫn có mô tả quan hệ với group.
- Không dùng màu duy nhất để báo slot quá khứ/đang diễn ra.


- Hiển thị giờ bắt đầu và kết thúc.
- Mọi task bắt buộc có cả hai.
- Không có task “Anytime”.
- Không có task chỉ gắn buổi mà không có giờ.

### Cột giữa — nội dung

#### Content rendering

- Title plain text; mô tả hỗ trợ line breaks cơ bản, không mount rich-text editor.
- Text được escape; không render HTML từ user input.
- Category icon từ registry, nhận semantic color token.
- Tooltip tên category dùng delay đủ tránh nhiễu khi rê chuột qua timeline.
- Nếu description cực dài, row vẫn có maximum readability width; có thể mở full edit bằng double-click, nhưng không mặc định truncate ngắn.


- Tiêu đề task.
- Mô tả đầy đủ.
- Category chỉ hiện bằng icon đẹp.
- Priority có hiển thị nhưng phải tinh tế.
- Không cắt mô tả vì người dùng không có nhu cầu viết quá dài.
- Có thể tự tăng chiều cao hàng để hiện hết nội dung.

### Cột phải — đánh giá

#### Assessment control

- Native `<button>` hoặc accessible button primitive.
- Không dùng checkbox role.
- `aria-haspopup` và label phản ánh trạng thái hiện tại.
- Focus ring không bị clip bởi row overflow.
- Radial fan portal ra overlay root nhưng giữ logical focus return về trigger.


- Vòng tròn trạng thái.
- Dùng để mở bộ chọn đánh giá mức độ hoàn thành.
- Không dùng làm checkbox hoàn thành đơn giản.
- Không thể hiện tiến độ thời gian thực.

## 5.5. Đường phân cách

- Mỗi task được phân cách bởi một line nhẹ.
- Không có nền card riêng dày.
- Không có shadow tạo cảm giác card.
- Có thể dùng hover/selected background cực nhẹ.
- Ưu tiên cảm giác “bảng biên tập cao cấp” hơn “kanban card”.

## 5.6. Single-click và double-click

### Interaction implementation

- Single click selection không trì hoãn để chờ double-click; dùng event strategy tránh flash sai state.
- Double-click mở dialog qua command/UI action, không tự chuyển sang inline edit.
- Keyboard tương đương: Enter hoặc shortcut mở edit; Space/selection behavior phải được chốt theo semantic pattern.
- Selection state là session state, không ghi SQLite.
- Khi row bị xóa trong lúc selected, selection chuyển deterministic sang row kế/previous hoặc clear.


### Single-click

- Chọn task.
- Làm task nổi nhẹ.
- Không mở popup.
- Không chỉnh trực tiếp.
- Không gây thay đổi dữ liệu.

### Double-click

- Mở popup chỉnh sửa ở giữa màn hình.
- Từ popup có thể chỉnh sửa hoặc xóa task.

## 5.7. Tạo task

### FAB và create command

- FAB là component custom, icon Phosphor hoặc custom SVG; không dùng dấu cộng và không dùng style Android mặc định.
- Vị trí dựa destination viewport safe inset; không dựa `window.innerWidth` hard-code.
- Nút nằm ngoài scroll content nếu mục tiêu là luôn hiện; phải tránh che task assessment cuối trang.
- Shortcut tạo task đăng ký trong typed command registry.
- Chỉ một create dialog được mở; repeated shortcut focus dialog hiện tại.

**OPEN — UX:** icon cuối, vị trí chính xác ở cửa sổ hẹp và mức blur overlay.


Nút tạo task:

- Là floating action button ở góc màn hình.
- Không dùng dấu cộng.
- Nên dùng một icon mang nghĩa:
  - soạn;
  - lập kế hoạch;
  - tạo lịch;
  - viết vào nhật trình.
- Icon cụ thể chưa chốt; cần thiết kế riêng hoặc chọn icon có nhận diện tốt.
- Nút phải đẹp, không giống FAB Android mặc định.

Khi bấm:

- Popup trung tâm xuất hiện.
- Phần xung quanh bị giảm sáng/giảm tương phản.
- Có thể blur nhẹ.
- Tạo cảm giác tập trung, cao cấp và “negative” rõ ràng quanh popup.
- Popup là một trong những điểm thẩm mỹ trọng tâm.

## 5.8. Popup tạo/chỉnh task

### Dialog technology

- Radix Dialog làm focus trap, portal, Escape, aria relationship.
- Styling bằng vanilla-extract; Motion animate content/overlay qua presence wrapper tương thích.
- Không dùng blur lớn toàn viewport; ưu tiên dim + saturation/contrast shift, blur nhẹ chỉ khi GPU profile đạt budget.
- Form state local + schema validation; domain validation cuối ở Rust.
- Date value dùng `@internationalized/date`; time wheel là custom controlled component.
- Save command disabled chỉ khi payload rõ ràng invalid hoặc đang commit; không khóa UI quá lâu.
- Error summary liên kết field; server/domain error không hiển thị toast mơ hồ nếu có field cụ thể.

### Autosave policy

Task dialog **không autosave từng ký tự vào DB**. Save là explicit atomic command. Draft recovery cho dialog chưa submit là DEFERRED, tránh tạo dữ liệu nửa vời.


Các trường đã chốt:

- Tiêu đề.
- Mô tả.
- Ngày.
- Giờ bắt đầu.
- Giờ kết thúc.
- Category.
- Priority.
- Recurring.

Không có:

- Ghi chú kết quả sau khi làm.
- Reminder.
- Windows notification.
- Trường nhập phần trăm hoàn thành.
- Trường actual time riêng đã được chốt.

## 5.9. Hạn chế nhập tay

Nguyên tắc:

- Hạn chế tối đa việc nhập số bằng bàn phím.
- Ưu tiên kéo, wheel, chip, chọn trực quan.
- Chỉ văn bản như tiêu đề và mô tả mới cần nhập tay.
- Các thông số khác phải có cơ chế tương tác hiện đại.

## 5.10. Bộ chọn giờ

### TimeWheel architecture

- Custom React component, không dùng native `<input type=time>` vì không đáp ứng wheel và filtering.
- Hai virtual columns: giờ và phút; TanStack Virtual chỉ dùng nếu full minute list render gây vấn đề, nếu không render đơn giản.
- Pointer/touch wheel, mouse wheel và keyboard phải cho cùng kết quả.
- Snap animation dùng Motion/WAAPI ngắn, không spring quá nảy.
- Option invalid không chỉ disabled bằng màu; screen reader biết unavailable.
- Availability bitmap hoặc interval set được Rust trả về theo date + mode + editing task ID.
- Frontend prevalidates nhưng save vẫn recheck trong transaction để tránh race với thao tác khác.

### Minute precision

Không giới hạn 5/15/30 phút. Tuy nhiên wheel có thể tăng tốc cuộn và snap từng phút; không biến granularity thành bước lớn để dễ code.


- Dạng wheel picker dọc giống khóa số.
- Có cột giờ và cột phút.
- Kéo lên/xuống.
- Độ chính xác đến từng phút.
- Không giới hạn theo bước 5, 15 hoặc 30 phút.
- Chỉ cho chọn những khoảng thời gian hợp lệ.
- Các giờ không hợp lệ phải bị vô hiệu hóa hoặc không xuất hiện.

## 5.11. Quy tắc khoảng thời gian hợp lệ

### Conflict engine

Rust service xây interval model:

- overlap thường: từ chối;
- exact same `[start,end)`: cho phép join cùng `time_slot_group_id`;
- edit task trong group: xác định tách group hay cập nhật cả slot theo UX đã chốt;
- boundary touching như 08:00–09:00 và 09:00–10:00: hợp lệ;
- 00:00–04:00: bất hợp lệ;
- recurring occurrence conflict: validate occurrence/override đang materialize.

Database có index trên `(date, start_minute, end_minute)`; invariant phức tạp vẫn do transaction service kiểm tra vì SQLite CHECK không đủ biểu diễn overlap toàn bảng.


- Bắt đầu phải nhỏ hơn kết thúc.
- Không cho chọn 00:00–04:00.
- Không cho tạo task chồng lên một khoảng đã có theo kiểu cạnh tranh trực tiếp.
- Nếu muốn dùng chung khung giờ, phải thêm task vào group cùng khung giờ.
- Bộ chọn giờ phải giúp ngăn xung đột ngay từ đầu thay vì tạo rồi mới cảnh báo.

## 5.12. Group task cùng khung giờ

### Data và layout

`TimeSlotGroup` là identity ổn định hoặc derived key được chuẩn hóa; ưu tiên entity rõ ràng nếu group có lifecycle/metadata. Mọi task trong group phải có cùng date/start/end bằng constraint/service.

- Query trả group projection đã sort priority → stable creation/order tie-breaker.
- Time cell dùng CSS Grid row span hoặc wrapper group; không dùng HTML table `rowspan` nếu phá responsive/accessibility.
- Connector/bracket là pseudo-element/SVG nhỏ, không canvas.
- Reorder thủ công trong group không có trong scope.
- Khi priority đổi, Motion layout animate vị trí nhưng focus không nhảy.


Nhiều task có thể nằm trong cùng một khung giờ.

Ý nghĩa:

- Đây là nhóm linh hoạt.
- Không bắt buộc thực hiện tuần tự.
- Không có thứ tự cứng về thời gian bên trong.
- Mỗi task vẫn là một đơn vị riêng.
- Mỗi task có đánh giá riêng.

Hiển thị:

```text
08:00–10:00 │ Task A │ ○
            │ Task B │ ○
            │ Task C │ ○
```

- Ô thời gian bên trái chỉ hiển thị một lần.
- Ô thời gian kéo dài qua toàn bộ nhóm.
- Có đường hoặc dấu ngoặc dọc thể hiện các hàng cùng một khung.
- Các task trong nhóm được tự sắp xếp theo priority:
  1. Cao.
  2. Vừa.
  3. Thấp.
- Không yêu cầu người dùng tự kéo thứ tự trong nhóm.

## 5.13. Priority

### Visual token

Priority là enum Rust/TypeScript sinh type: `low | medium | high`. Marker dùng semantic token `priority.low/medium/high`, nhưng:

- không dùng badge chữ lớn;
- không đổi toàn bộ row color;
- có accessible text trong row description/menu;
- icon/shape khác nhau hoặc label khi cần để không dựa màu;
- high priority không tự động thay đổi lịch hoặc recurring.


Có ba mức:

- Thấp.
- Vừa.
- Cao.

Hiển thị:

- Có xuất hiện trên hàng task.
- Không quá nổi bật.
- Có thể dùng:
  - ký hiệu nhỏ;
  - sắc độ;
  - marker mảnh;
  - icon tối giản.
- Không nên dùng badge chữ lớn.
- Priority là tín hiệu phụ, không được tranh sự chú ý với nội dung và thời gian.

## 5.14. Category

### Category architecture

- Category là entity archiveable, không hard delete nếu đã dùng.
- Icon lưu bằng stable registry key, không lưu React component name tùy ý.
- Color lưu dưới dạng semantic/custom token value đã validate gamut/contrast.
- Weekly minimum/target lưu phút integer, `minimum ≤ target` trừ khi target null theo quyết định UX.
- Category sort order dùng fractional/rank key hoặc integer resequence trong transaction.
- Analytics historical rendering phải giữ snapshot semantics khi category đổi; tối thiểu archive giữ record cũ.
- Icon picker dùng virtualized searchable grid nếu library lớn; Phosphor imports được lập whitelist/build manifest, không dynamic import từ internet.


Ví dụ:

- Tiếng Anh.
- Lab.
- Code.
- Thể thao.
- Học trên trường.
- Tài chính.
- Việc cá nhân.

Mỗi category:

- Tự tạo.
- Đổi tên.
- Chọn màu.
- Chọn icon.
- Đặt mục tiêu tối thiểu theo tuần.
- Đặt mục tiêu kỳ vọng theo tuần.

Trên task:

- Chỉ hiện icon.
- Không hiện tên category thường trực.
- Tooltip hoặc popup có thể cho biết tên khi cần.

Trong Analytics:

- Category là đơn vị thống kê thời lượng.
- Category là đơn vị streak tuần.
- Category là một biến đầu vào của hệ thống điểm.

## 5.15. Recurring

### Recurrence engine

**LOCKED — Technology**

- Model theo RFC 5545: DTSTART, RRULE, RDATE, EXDATE và occurrence override.
- Rust crate `rrule` dùng để parse/expand trong core; không tin hoàn toàn logic frontend.
- Không materialize vô hạn; expand theo visible range, thường tháng hiện tại cộng guard range nhỏ.
- Cache occurrence là derived/rebuildable; master series + overrides là source of truth.
- Mọi series có timezone/local-time semantics rõ ràng.

### Ba phạm vi sửa

- **Chỉ lần này:** EXDATE occurrence gốc + override instance.
- **Từ lần này trở đi:** split series cũ tại boundary, tạo series mới.
- **Toàn bộ:** update master; policy với exceptions phải explicit và có preview nếu có nguy cơ thay đổi lịch sử.

### Test bắt buộc

- cuối tháng/năm;
- leap day;
- DST dù người dùng hiện ở Việt Nam;
- count/until;
- exception và split;
- recurrence edit không tạo duplicate;
- chỉ materialize đúng range.


- Task có recurring.
- Khi sửa một instance recurring, phải có ba lựa chọn:
  1. Chỉ sửa lần này.
  2. Từ lần này trở đi.
  3. Sửa toàn bộ chuỗi.
- Không sinh hoặc hiển thị vô hạn mọi occurrence tương lai.
- Chỉ materialize/hiển thị occurrence trong tháng đang xem.
- Khi chuyển sang tháng khác, hệ thống hiển thị occurrence của tháng đó.

## 5.16. Reminder

### Enforcement trạng thái REMOVED

- Không thêm notification plugin vào dependency mặc định.
- Không tạo scheduler/background daemon.
- Không có trường reminder trong schema/API/UI.
- Không có permission notification trong Tauri capabilities.
- Test schema và UI xác nhận reminder không xuất hiện.
- Recurrence chỉ phục vụ hiển thị task, không được dùng làm lý do khôi phục notification.


Đã loại bỏ:

- Không cần reminder.
- Không cần Windows notification.
- Không cần âm thanh.
- Không cần snooze.
- Không cần nút “Đã biết”.
- Không cần các mốc 5/15/30 phút.

## 5.17. Task bỏ lỡ

### Missed state derivation

- `missed` có thể được materialize bởi maintenance command khi app mở/đổi ngày hoặc derive theo date + evaluation; lựa chọn cuối phải bảo đảm lịch sử ổn định.
- Không cần process chạy lúc nửa đêm khi app đóng.
- Khi app mở, Rust chạy idempotent day-boundary maintenance trong transaction.
- Task đã đánh giá không chuyển missed.
- Task missed giữ original date/time và recurrence identity.
- UI giảm emphasis bằng opacity/color token có floor contrast; accessible label nói “Bỏ lỡ”.


- Task qua ngày mà chưa được đánh giá sẽ tự chuyển sang trạng thái **Bỏ lỡ**.
- Task vẫn nằm nguyên tại ngày và vị trí thời gian cũ.
- Không tự chuyển sang ngày tiếp theo.
- Không hỏi chuyển ngày.
- Không đưa xuống một vùng “Bỏ lỡ” riêng.
- Giao diện có thể mờ hơn hoặc có marker bỏ lỡ.
- Dữ liệu lịch sử phải giữ nguyên.

## 5.18. Đường thời gian hiện tại

### CurrentTimeIndicator

- Cập nhật mỗi phút bằng timer căn theo đầu phút, không interval drift kéo dài.
- Không animate liên tục; chỉ reposition khi phút đổi hoặc layout đổi.
- Không dùng đỏ mặc định; semantic `time.now` tương phản thấp nhưng discernible.
- Indicator có `aria-hidden` nếu thông tin thời gian hiện tại đã có label khác, tránh screen reader spam.
- Auto-scroll chỉ chạy khi mở Today hoặc user explicit “jump to now”; không giật scroll khi user đang đọc vùng khác.


Trong Today:

- Có một đường ngang chỉ thời gian hiện tại.
- Phải thiết kế cực kỳ cẩn thận để không phá thẩm mỹ.
- Đường mảnh.
- Tương phản thấp.
- Nhãn giờ hiện tại có thể rõ hơn một chút.
- Không dùng màu đỏ chói mặc định.
- Không làm animation liên tục gây phân tâm.

Khi mở Today:

- Tự cuộn đến vùng gần thời gian hiện tại.
- Chừa một khoảng phía trước để người dùng nhìn được task sắp tới.
- Không cuộn chính xác sát mép trên.

## 5.19. Không hiển thị điểm trên Task

- Không hiển thị điểm ngày trong Today.
- Không hiển thị điểm tuần trong timeline.
- Không hiển thị streak cạnh task.
- Không hiển thị Analytics card cố định bên phải.
- Task view chỉ tập trung vào thực thi và review từng task.

---

# 6. Lịch tháng và điều hướng ngày

### Calendar architecture

**LOCKED — Technology substrate; UX chi tiết theo đặc tả**

- Calendar tự xây bằng CSS Grid để kiểm soát day cell, micro bars, category icons và motion.
- Không dùng FullCalendar hoặc scheduler tổng quát trong core.
- `@internationalized/date` xử lý calendar arithmetic và locale values ở frontend.
- Rust trả `MonthProjection`: ngày, task count, scheduled minutes, top category icon keys, morning/afternoon/evening load, missed marker.
- Projection lấy từ aggregate table/query, không query từng ô gây N+1.
- Month navigation prefetch tháng liền kề khi idle, nhưng không preload vô hạn recurring occurrences.
- Grid có semantic table/grid pattern và keyboard navigation theo WAI-ARIA phù hợp.


## 6.1. Today week strip

### WeekStrip component

- Dùng 7 day buttons + previous/next controls, không horizontal scroll mặc định.
- Selected day và today là hai state riêng.
- Active day indicator có thể dùng Motion `layoutId` nhưng text không scale.
- Locale weekday lấy từ formatter, không hard-code T2/T3 nếu sản phẩm đổi ngôn ngữ.
- Dấu task/status là decoration phụ, có accessible summary nếu mang nghĩa.
- Query key theo ISO local date; chuyển ngày không remount toàn app shell.


Today nên có một dải tuần ở phía trên:

```text
‹ 27 T2  28 T3  29 T4  30 T5  31 T6  01 T7  02 CN ›
```

Có thể hiển thị:

- Ngày hiện tại.
- Ngày đang chọn.
- Dấu hiệu ngày có task.
- Vòng/chấm nhẹ biểu thị trạng thái tổng quát, nhưng không hiển thị điểm số.

Dải tuần giúp đổi ngày nhanh mà không cần mở lịch tháng.

## 6.2. Calendar view

### Month view layout

- 7 cột ổn định; 5–6 hàng tùy tháng.
- Day cell dùng container query/density token để giảm chi tiết khi cửa sổ hẹp.
- Không nested card shadow; cell là grid surface với divider/spacing.
- Click ngày điều hướng sang day timeline; không mở create dialog trực tiếp.
- Keyboard: arrow move, Home/End theo week, PageUp/PageDown đổi tháng nếu pattern được áp dụng đầy đủ.
- Focus phải đi cùng selected date nhưng không tự mở timeline cho đến activation nếu đó là grid navigation.


- Calendar là màn hình tháng riêng.
- Không đặt lịch tháng cố định bên cạnh timeline.
- Không làm timeline bị hẹp.
- Bấm một ô ngày để mở timeline ngày đó.
- Không tạo task ngay trên ô ngày.
- Sau khi mở ngày mới dùng nút tạo task.

## 6.3. Nội dung ô ngày

### Data projection và rendering

`CalendarDayProjection` tối thiểu:

```text
date
is_today
is_selected
task_count
scheduled_minutes
category_icon_keys[0..3]
extra_category_count
morning_load_ratio
afternoon_load_ratio
evening_load_ratio
has_missed
```

- Load ratio clamp 0–1 và được tính theo capacity của từng buổi; công thức phải versioned.
- Micro bar dùng CSS, không chart library.
- Category icon order theo thời lượng hoặc priority rule đã chốt; deterministic.
- `+N` có tooltip/list accessible.
- Empty day không tạo placeholder noise.
- Aggregate được update trong cùng transaction với task mutation hoặc invalidated/recomputed idempotently.


Bố cục được đề xuất và đã được giao quyền tự chốt:

```text
┌─────────────────┐
│ 01              │
│ 5 task · 6h20   │
│ 🎓  ⚗  🏃 +1   │
│ ━━━  ━━  ━━━━  │
└─────────────────┘
 Sáng Chiều Tối
```

Mỗi ô gồm:

1. Số ngày.
2. Số lượng task.
3. Tổng thời lượng dự kiến.
4. Tối đa ba icon category.
5. Nếu nhiều hơn, hiển thị `+N`.
6. Ba micro bar:
   - Sáng.
   - Chiều.
   - Tối.
7. Micro bar thể hiện mức độ kín của từng buổi.

Không hiển thị:

- Điểm.
- Streak.
- Danh sách tên task đầy đủ.
- Priority.
- Mức đánh giá từng task.

## 6.4. Trạng thái ngày

- Ngày hiện tại: viền accent nhẹ.
- Ngày được chọn: nền nhấn rõ hơn.
- Ngày quá khứ có task bỏ lỡ: chấm cảnh báo nhỏ.
- Ngày không có task: giữ cực sạch.
- Không dùng quá nhiều màu.

---

# 7. Đánh giá mức độ hoàn thành task

### Completion subsystem architecture

- `CompletionState` là configurable entity với stable ID, label, order, hidden normalized value, visual token và archived flag.
- `TaskEvaluation` lưu state ID, snapshot label/value cần bảo toàn lịch sử, evaluated_at và optional model metadata.
- UI chỉ hiển thị label/visual; thuật toán dùng hidden value.
- Prediction là assistive ranking/size signal, không tự chọn và không thay đổi logical order.
- Evaluation command là atomic, tạo inverse command cho undo và update analytics aggregate.


## 7.1. Bản chất

Đây không phải trạng thái workflow kiểu:

- Đang làm.
- Gần xong.
- Hoàn thành.

Đây là **đánh giá hậu nghiệm** về mức độ thực hiện task so với mục tiêu ban đầu.

Thời điểm dùng:

- Sau khi task kết thúc.
- Khi người dùng chủ động review cuối ngày.
- Người dùng bấm từng task riêng.
- Không có batch review bắt buộc.
- Không có wizard review toàn ngày.

## 7.2. Bộ trạng thái mặc định

### Default seed và customization

Seed ban đầu gồm bốn trạng thái nhưng ID không phụ thuộc label tiếng Việt. Ví dụ internal keys có thể là `none`, `below`, `met`, `excellent`; label có thể đổi.

- Reorder lưu `sort_key`.
- State đã dùng chỉ archive, không hard delete.
- Hidden value phải nằm trong range chuẩn hóa, validate monotonic theo order nếu product quyết định order phản ánh mức tăng.
- Thay mapping không retroactively sửa evaluation lịch sử trừ migration explicit.
- Settings có preview radial fan và warning khi thay mapping ảnh hưởng điểm tương lai.


Bộ mặc định cô đọng:

- Không làm.
- Chưa đạt.
- Đạt.
- Rất tốt.

Tuy nhiên đây chỉ là mặc định.

Trong Settings:

- Đổi tên trạng thái.
- Thêm trạng thái.
- Bớt trạng thái.
- Sắp thứ tự trạng thái.
- Ánh xạ mỗi trạng thái sang một giá trị số ẩn.

## 7.3. Ánh xạ ngầm

### Scoring data contract

- UI DTO thông thường không cần expose hidden value nếu không phục vụ Settings.
- Rust scoring service nhận evaluation snapshot value, không lấy mapping hiện tại cho task cũ.
- Floating percentages không dùng làm primary storage; có thể lưu integer basis points để deterministic.
- Version scoring/mapping để audit thay đổi điểm theo thời gian.
- Export phải ghi label và semantic value đủ để import không làm mất nghĩa.


- Giao diện thông thường chỉ hiển thị chữ.
- Người dùng không phải chọn 63%, 70% hoặc 85%.
- Mỗi mức chữ được ánh xạ sang một giá trị chuẩn hóa.
- Giá trị được dùng bởi thuật toán điểm.
- Phần trăm không cần xuất hiện trên task.
- Analytics chỉ hiển thị điểm tổng hợp 0–100, không cần lộ mọi mapping.

## 7.4. Vòng tròn đóng

### Trigger rendering

- Button 40–44 CSS px hit target nominal; visual ring có thể nhỏ hơn.
- Ring dùng SVG hoặc CSS conic/radial primitives; không canvas.
- State visual: empty, selected level, missed/unavailable và focus.
- Tooltip label chỉ bổ sung, không là cách duy nhất biết trạng thái.
- Animation fill/ring 150–250 ms, transform/opacity/stroke-dasharray có kiểm soát.


- Cột phải hiển thị một vòng tròn.
- Chưa đánh giá: vòng tròn rỗng.
- Đã đánh giá: vòng tròn phản ánh mức được chọn bằng:
  - fill;
  - ring;
  - icon;
  - sắc độ;
  - label khi hover.
- Không dùng checkbox tick đơn giản.

## 7.5. Bộ chọn hình quạt

### RadialFan technology

**PROTOTYPE-GATED nhưng hướng đã khóa:**

- Floating UI tính anchor, clipping rect và hướng fallback.
- Custom polar geometry tính vị trí option; không dùng menu dọc disguised.
- Motion for React animate presence, scale và opacity.
- Portal ra overlay layer; focus roving trong fan.
- Logical state order ổn định; geometry có thể mirror/rotate gần cạnh nhưng quan hệ thứ tự phải dễ học.
- Pointer target tối thiểu không giảm theo probability.
- Option lớn hơn vì xác suất nhưng center distance/collision phải giữ không chồng.

### Geometry contract

```text
anchor       = tâm trigger
fan arc      = ưu tiên phía trên
radius       = function(option_count, viewport, target_size)
angle order  = fixed by completion-state order
size         = base + bounded probability emphasis
collision    = no overlap + viewport padding
```

Nếu không đủ chỗ, fallback theo thứ tự: giảm radius/angle spread trong giới hạn → đổi hướng → dùng accessible compact fallback, nhưng không tự biến thành menu dọc trong điều kiện bình thường.


Khi bấm vòng tròn:

- Các trạng thái bung thành menu hình quạt.
- Các lựa chọn là các ô tròn nằm phía trên quanh điểm bấm.
- Không bung thành menu chữ dọc.
- Không cần vòng tròn 360 độ đầy đủ.
- Ưu tiên cung quạt hướng lên trên.
- Nếu gần cạnh màn hình, hướng bung phải tự điều chỉnh để không bị cắt.

## 7.6. Xác suất dự đoán

### Prediction scope

**OPEN — Algorithm; LOCKED — UX constraints**

Phiên bản đầu có thể dùng heuristic/local model hoàn toàn offline. Features tiềm năng:

- task category;
- priority;
- scheduled duration;
- time of day/day of week;
- lịch sử evaluation của category/task pattern;
- missed frequency;
- recurring identity.

Ràng buộc:

- Không gửi dữ liệu ra server.
- Không thay đổi option order.
- Probability chỉ điều chỉnh emphasis trong range bounded.
- Có cold-start fallback đồng đều.
- Model output không được lưu như sự thật; chỉ metadata optional để evaluation nghiên cứu sau.
- Prediction failure không làm fan không dùng được.
- Cần calibration test, latency budget và khả năng tắt.

Không chọn framework ML nặng trước khi heuristic baseline được benchmark. Rust hoặc TypeScript pure function đủ cho bản đầu.


- Hệ thống có thể dự đoán trạng thái có khả năng người dùng chọn.
- Ô có xác suất cao nhất là ô lớn nhất.
- Các ô còn lại có kích thước tương quan với xác suất.
- Mục tiêu là:
  - thao tác nhanh;
  - hiện đại;
  - tạo cảm giác thông minh;
  - vẫn để người dùng quyết định.

Quy tắc UX bắt buộc:

- Vị trí logic của từng trạng thái phải ổn định.
- Không đổi thứ tự trạng thái theo xác suất.
- Chỉ thay đổi kích thước hoặc độ nổi bật.
- Giữ muscle memory.
- Không để ô lớn che ô khác.
- Không làm lựa chọn xác suất thấp khó bấm.

## 7.7. Sau khi chọn

### Transaction sequence

1. UI optimistic cập nhật ring và đóng fan.
2. `EvaluateTask` command gửi task ID + state ID + operation ID.
3. Rust xác minh task tồn tại, state active và temporal rule nếu có.
4. Transaction upsert evaluation snapshot, clear missed nếu policy cho phép, update aggregates, ghi inverse token.
5. Result reconcile; lỗi mở lại trạng thái cũ và thông báo không phá focus.
6. Query invalidation: task day, calendar day projection, analytics periods liên quan.

Không mở confirmation dialog; undo là đường hồi phục chính cho lựa chọn nhầm.


1. Lưu trạng thái.
2. Lưu giá trị số ẩn.
3. Lưu thời điểm đánh giá.
4. Menu quạt thu lại.
5. Vòng tròn cập nhật.
6. UI phản hồi bằng animation ngắn.
7. Analytics được cập nhật.
8. Không mở popup khác.
9. Không yêu cầu xác nhận.

## 7.8. Phân biệt trạng thái vận hành và đánh giá

Phải tách hai lớp:

### Trạng thái vận hành

- Chưa đến giờ.
- Đang trong khung giờ.
- Đã qua khung giờ.
- Đã qua ngày.

### Đánh giá kết quả

- Các mức do người dùng cấu hình.
- Chỉ phản ánh mức độ hoàn thành.

Không dùng một hệ trạng thái để thay thế hệ còn lại.

---

# 8. Analytics, điểm số, thời lượng và streak

### Analytics architecture

- Analytics là read model riêng, không tính toàn bộ từ raw task trong mỗi render.
- Rust scoring engine là pure/versioned module; aggregate tables có thể rebuild từ raw data.
- UI nhận projection theo period và granularity.
- Không dùng chart library lớn mặc định. Bar, ring, distribution đơn giản dùng SVG/CSS custom; chỉ chọn thư viện chart sau prototype nếu complexity tăng.
- Mọi chart có bảng/text equivalent và không truyền nghĩa chỉ bằng màu.
- Query chạy DB worker, không main thread.

### Aggregate strategy

```text
raw tasks/evaluations/categories
        ↓ transaction/invalidation
period aggregates (day/week/month/year)
        ↓
AnalyticsProjection
        ↓
TanStack Query cache
```

Aggregate có `algorithm_version` và `computed_at`; rebuild command phải idempotent.


## 8.1. Analytics là trang riêng

- Không nhồi vào Today.
- Không đặt panel cố định cạnh timeline.
- Có destination riêng trong sidebar.

Ba tab cố định:

- Tuần.
- Tháng.
- Năm.

Không dùng một timeline kéo liên tục để đổi granularity.

## 8.2. Thứ tự ưu tiên trang tuần

### Layout contract

- Trang dùng editorial vertical flow, không dashboard grid dày.
- Weekly score là hero metric đầu tiên.
- Category time section dùng progress against minimum/target.
- Streak và distribution xuống sau.
- Responsive layout dùng CSS Grid/Container Queries; không cố nhồi mọi panel cùng hàng.
- Charts lazy-render khi dưới fold nếu nặng, nhưng text summary có sẵn.


1. Điểm tuần là thành phần lớn nhất ở đầu trang.
2. Thời gian theo category.
3. Mức đạt tối thiểu và mục tiêu.
4. Streak.
5. Phân bố mức đánh giá.
6. So sánh kỳ trước nếu cần.

## 8.3. Điểm tổng hợp

### Score contract

**OPEN — Formula; LOCKED — interface**

- Output integer/decimal 0–100 theo quyết định cuối.
- Score không là trung bình cộng task ngây thơ.
- Rust scoring function nhận immutable input snapshot và config version.
- Test property: bounded 0–100, deterministic, monotonic ở các trường hợp được định nghĩa, không farm bằng split task, không bị một task dài thống trị vô hạn.
- Không hiển thị explanation AI dài; có thể cung cấp component statistics để người dùng tự hiểu.
- Khi algorithm version đổi, lịch sử phải có policy: recompute toàn bộ hoặc preserve snapshots; không trộn im lặng.


- Thang điểm 0–100.
- Chỉ hiển thị số.
- Không cần cấp bậc chữ cố định.
- Không cần explanation panel giải thích từng điểm tăng/giảm.
- Không cần “AI insight” dài dòng.
- Các thống kê thành phần vẫn giúp người dùng tự hiểu bối cảnh.

## 8.4. Màu điểm

### Color implementation

- Semantic tokens `score.veryLow`, `score.below`, `score.ok`, `score.good`, `score.excellent` sinh bằng OKLCH.
- Culori build-time kiểm tra gamut và tạo sRGB fallback.
- Light/dark có perceived lightness tương đương, không chỉ đảo màu.
- Số/label/shape là primary signal; color secondary.
- Contrast kiểm tra WCAG 2.2 cho text và non-text UI.


Đề xuất:

- **0–39:** đỏ trầm — rất thấp.
- **40–59:** cam hổ phách — dưới kỳ vọng.
- **60–74:** vàng dịu — tạm ổn.
- **75–89:** xanh lam ngọc — tốt.
- **90–100:** xanh lục bảo — xuất sắc.

Nguyên tắc:

- Số là tín hiệu chính.
- Màu là tín hiệu hỗ trợ.
- Không tô cả màn hình.
- Không dùng đỏ/xanh quá bão hòa.
- Phải có khả năng đọc tốt ở light/dark mode.
- Không chỉ dựa vào màu để truyền tải ý nghĩa.

## 8.5. Thuật toán điểm

### Engineering contract cho thuật toán chưa chốt

Scoring module phải tách khỏi UI và repository:

```text
ScoringInput → normalize → caps/weights → period aggregation → ScoreResult
```

Yêu cầu kỹ thuật:

- fixed-point hoặc rounding policy rõ;
- property tests với proptest;
- golden fixtures cho các tuần mẫu;
- simulation chống gaming;
- sensitivity analysis khi đổi weight;
- không dùng model opaque nếu rule-based đủ;
- config/version nằm trong DB hoặc code migration rõ;
- score preview trong Settings không được ghi dữ liệu.

Không khóa formula trong tài liệu này vì nguồn sản phẩm chưa đủ hỗ trợ.


Thuật toán phải phức tạp và phản ánh chất lượng thực tế, không chỉ đếm task.

Các đầu vào đã xác định:

- Mức đánh giá từng task.
- Priority.
- Category.
- Thời lượng task.
- Mức tối thiểu theo category.
- Mục tiêu theo category.
- Streak.
- Dữ liệu tuần/tháng/năm.
- Task bỏ lỡ.

Các nguyên tắc cần bảo vệ:

- Không khuyến khích tạo nhiều task nhỏ để “farm điểm”.
- Không cho một category nhiều task nhỏ lấn át category quan trọng khác.
- Task priority cao phải có ảnh hưởng hợp lý.
- Không để một task cực dài chi phối toàn bộ ngày một cách phi lý.
- Điểm tuần/tháng/năm không chỉ là trung bình cộng ngây thơ.
- Thuật toán chưa được chốt công thức cụ thể trong tài liệu này.
- Ngưỡng streak ngày do thuật toán xác định, không phải con số cố định do người dùng nhập.

## 8.6. Thống kê thời gian theo category

### Duration semantics

**OPEN — Product:** chưa có actual-time tracker. Vì vậy mọi projection phải ghi rõ loại thời gian:

- `scheduled_minutes` là dữ liệu chắc chắn;
- `effective_minutes` chỉ tồn tại nếu thuật toán điều chỉnh theo completion và phải versioned;
- không gọi là “thời gian thực tế” nếu không đo.

Database aggregate giữ scheduled minutes và evaluation-weighted value tách cột, tránh mất khả năng giải thích. UI label không được gây hiểu nhầm.


Mỗi category có hai ngưỡng:

1. **Tối thiểu.**
2. **Mục tiêu.**

Ví dụ:

- Thể thao:
  - tối thiểu 3 giờ/tuần;
  - mục tiêu có thể cao hơn.
- Tiếng Anh.
- Lab.
- Code.
- Các category khác.

Analytics cần thể hiện:

- Tổng thời lượng theo tuần.
- So với tối thiểu.
- So với mục tiêu.
- Phần trăm đạt.
- Mức thiếu.
- Mức vượt.
- Phân bổ giữa các category.
- Xu hướng theo tháng/năm.

Lưu ý chưa chốt:

- Chưa có trường actual time riêng trong popup.
- Vì vậy cách quy đổi “thời gian dành cho category” cần được thiết kế ở giai đoạn thuật toán:
  - có thể dùng scheduled duration;
  - có thể điều chỉnh theo mức đánh giá;
  - không được giả định có time tracker nếu chưa thêm tính năng.

## 8.7. Streak

### Streak engine

- Streak tính trong Rust từ period aggregates.
- Chỉ ba loại meaningful đã chốt; không generic streak engine tạo hàng chục badge.
- Day boundary theo local timezone.
- Category archive không xóa lịch sử streak.
- Algorithm threshold có version.
- Rebuild streak từ raw/aggregate phải deterministic.
- UI không animate lửa/gamification quá mức; icon/typography editorial.


Chỉ giữ streak có ý nghĩa.

Không tạo streak vụn vặt như:

- Mở ứng dụng.
- Bấm một task.
- Tạo task.
- Check-in.

Các streak có ý nghĩa đã chốt:

1. Chuỗi ngày đạt ngưỡng điểm do thuật toán xác định.
2. Chuỗi tuần đạt mức thời lượng tối thiểu của từng category.
3. Chuỗi tuần đạt mục tiêu của từng category.

Có thể hiển thị:

- Current streak.
- Longest streak.
- Ngày/tuần bắt đầu.
- Thời điểm bị đứt.
- Không cần tạo quá nhiều loại phụ.

## 8.8. Tổng kết theo thời gian

Hệ thống phải tổng kết:

- Ngày.
- Tuần.
- Tháng.
- Năm.

Dữ liệu gốc luôn đến từ:

- Task cụ thể.
- Đánh giá task.
- Thời lượng.
- Category.
- Priority.
- Mục tiêu.

---

# 9. Life System dạng cây card

### Life Browse architecture

Life Browse không render toàn cây. Nó là scene điều hướng hai tầng với HTML cards và SVG connector overlay.

- Node data từ Rust projection: selected node + direct children + breadcrumb + pinned metadata.
- Layout Browse là custom deterministic composition, không dùng graph force simulation.
- Motion for React `layoutId` giữ continuity node/card/title.
- SVG connector cập nhật theo measured card anchor; ResizeObserver dùng tập trung, tránh mỗi child tự tạo observer nếu có thể.
- Sidebar tự collapse theo contract nhưng không mất keyboard focus.
- Reader bundle được preload nhẹ khi hover/focus leaf nếu không ảnh hưởng startup.

### Performance

Số node visible nhỏ nên không virtualize. Ưu tiên DOM đơn giản, transform/opacity và không blur diện rộng.


## 9.1. Mục đích

Life System là hệ thống ghi lại:

- Mục tiêu dài hạn.
- Lĩnh vực cần tập trung.
- Nguyên tắc.
- Điều cần lưu ý.
- Điều cần tránh.
- Kế hoạch.
- Định hướng.
- Kết luận quan trọng.
- Cấu trúc tư duy cá nhân.

## 9.2. Browse Mode chỉ hiện hai tầng

### Layout contract

- Selected node là focal element, không nhất thiết đúng tâm pixel nhưng có visual dominance.
- Direct children dùng constrained fan/grid/arc tùy prototype; thứ tự sibling ổn định.
- Connector không xuyên text/card.
- Container query chuyển arrangement khi width không đủ; không thu nhỏ card đến mức khó đọc.
- Branch có quá nhiều children phải có strategy được prototype: wrap có hierarchy, pagination cục bộ hoặc cluster, nhưng không tự hiển thị full tree.
- Screen reader nhận danh sách children và quan hệ parent, không cần đọc SVG connector.


Mỗi màn hình chỉ hiện tối đa hai tầng:

1. Card đang được chọn ở tầng trên/trung tâm.
2. Các card con trực tiếp ở phía dưới.

Ví dụ:

```text
              [HỌC TẬP]
           /      |       \
     [Đại học] [Tiếng Anh] [Nghiên cứu]
```

Không hiển thị toàn bộ cây ở Browse Mode.

## 9.3. Chuyển xuống node con

### Transition choreography

1. Lock navigation operation ID, không khóa toàn UI lâu.
2. Selected child giữ `layoutId` và di chuyển lên focal slot.
3. Old focal node giảm emphasis/rời scene.
4. Connector fade/repath sau node positions ổn định.
5. New children enter stagger nhẹ.
6. Breadcrumb và history update trong cùng navigation state transition.
7. Focus chuyển đến focal node mới theo quy tắc accessibility, không theo animation frame ngẫu nhiên.

Duration 300–500 ms nominal; Reduced Motion dùng cross-fade ngắn và cập nhật focus tức thời. Browser back/Back button dùng navigation history riêng, không phụ thuộc browser URL nếu route model không cần.


Khi bấm một card con:

1. Card con được chọn.
2. Card đó di chuyển mượt lên vị trí trung tâm.
3. Card trung tâm cũ lùi lại, mờ đi hoặc rời khung.
4. Các card con mới xuất hiện phía dưới.
5. Các đường nối tái cấu trúc đồng bộ.
6. Breadcrumb cập nhật.
7. Lịch sử điều hướng được giữ.

Mục tiêu:

- Tạo cảm giác đi sâu vào một hệ thống.
- Không gây mất phương hướng.
- Chuyển cảnh phải là một trong những điểm wow của ứng dụng.

## 9.4. Card trung gian

### Card component

- `LifeNodeCard` dùng semantic button/link tùy navigation behavior, không clickable div.
- Icon Phosphor/custom SVG, title, short description 1–3 dòng và optional child count.
- Card material lấy branch theme token nhưng content contrast vẫn global accessible.
- Decorative motif `aria-hidden` và pointer-events none.
- Không mount Tiptap/Markdown renderer cho short description.
- Hover/pointer effect không dịch card quá xa làm connector rung.


Card có card con chủ yếu dùng để:

- Điều hướng.
- Chứa icon.
- Chứa tiêu đề.
- Chứa họa tiết.
- Chứa một mô tả ngắn khoảng 1–3 dòng.
- Hiển thị số card con nếu cần.

Không hiển thị nội dung dài mặc định.

## 9.5. Leaf card

### Reader opening

- Shared-element từ card shell/title sang Reader hero bằng `layoutId` namespace theo node/document ID.
- Navigation state lưu origin rect/scroll anchor nếu cần back transition.
- Reader dùng Tiptap Static Renderer hoặc custom scene renderer từ canonical JSON, không giữ Editor instance.
- Tree unmount hoặc Activity-hidden tùy profile; không để animation background tiếp tục chạy ngoài view.
- Back trả đúng node và scroll position.
- Load failure hiển thị recovery state, không mất tree context.


Khi bấm card cuối:

- Không hiển thị nội dung phía dưới cây.
- Không mở panel bên cạnh.
- Mở một trang đọc riêng.
- Dùng shared-element transition.
- Card mở rộng thành trang đọc.
- Cây rút khỏi khung theo animation.

## 9.6. Back và breadcrumb

Dùng kết hợp:

- Nút Back.
- Breadcrumb.

Breadcrumb ví dụ:

```text
Life System / Học tập / Tiếng Anh
```

Vai trò:

- Cho biết vị trí.
- Cho phép quay nhanh.
- Không thay thế hoàn toàn nút Back.
- Không làm breadcrumb quá nặng.

## 9.7. Pinned

### Pinned projection

- `pinned` là property hoặc join entity tùy cần custom order; không duplicate node.
- Pinned view query riêng, lazy loaded trong Life System.
- Activation điều hướng đến node hoặc Reader bằng stable ID.
- Node archived/unavailable hiển thị state rõ và cho unpin.
- Không đưa pinned vào main app sidebar để giữ IA đã chốt.


- Card có thể được ghim.
- Pinned không nằm thành hàng cố định phía trên cây.
- Pinned không nằm lẫn trong sidebar chính.
- Có một vùng/trang Pinned riêng trong Life System.
- Mục đích là truy cập nhanh các node thường dùng.
- Bấm pinned card phải đưa về đúng node hoặc mở leaf tương ứng.

---

# 10. Life System Edit Mode

### Full-tree editor architecture

**LOCKED — Technology**

- d3-hierarchy `tree()` tính tidy tree geometry.
- HTML/CSS render node cards để typography, focus và DnD sắc nét.
- SVG overlay render connector/path/preview.
- dnd-kit xử lý pointer + keyboard sensors, DragOverlay và collision.
- Motion for React animate reflow sau transaction.
- Rust transaction validate reparent và cycle.
- TanStack Virtual chỉ bật cho cây lớn sau benchmark; không virtualize sớm làm DnD phức tạp.

Không dùng React Flow làm core vì đây là constrained tree, không phải freeform node canvas.


## 10.1. Chế độ riêng

- Không chỉnh cấu trúc cây trong Browse Mode.
- Không rải nút chỉnh sửa lên giao diện xem.
- Có một Edit Mode riêng và cực đẹp.
- Đây là trải nghiệm hạng nhất, không phải màn hình quản trị thô.

## 10.2. Hiển thị toàn bộ cây

### Geometry pipeline

```text
LifeNode rows
  → build hierarchy
  → stable sibling sort
  → d3 tree layout with nodeSize/separation
  → viewport transform/scroll coordinates
  → HTML nodes + SVG links
```

- Geometry là derived state, không lưu tọa độ pixel vào DB.
- Node width/height lấy token/profile; dynamic text bị giới hạn để geometry ổn định.
- Full tree theo chiều dọc như đặc tả; x/y có thể swap để đạt orientation.
- Zoom-out chỉ là optional Studio overview; không mặc định biến thành infinite canvas.
- Scroll anchor giữ node đang thao tác khi reflow.


Trong Edit Mode:

- Hiển thị full tree.
- Card được thu nhỏ.
- Cây triển khai theo chiều dọc.
- Người dùng cuộn xuống để đi sâu.
- Có thể nhìn cấu trúc nhiều tầng.
- Đường nối rõ nhưng tinh tế.
- Không bị giới hạn hai tầng như Browse Mode.

## 10.3. Chỉnh cấu trúc

### Command catalog

- `CreateLifeNode`
- `RenameLifeNode`
- `ArchiveLifeNode`
- `RestoreLifeNode`
- `SetLifeNodeIcon`
- `SetLifeNodeThemeVariant`
- `ReorderLifeSibling`
- `ReparentLifeNode`
- `PinLifeNode` / `UnpinLifeNode`
- `ConvertBranchLeaf` chỉ khi invariant child/document được giải quyết.

Mỗi command chạy transaction, trả inverse command/undo token và path invalidation hints. Frontend không gửi “toàn bộ cây mới” sau drag; chỉ gửi intent tối thiểu.


Cho phép:

- Tạo card.
- Xóa card.
- Đổi tên.
- Đổi icon.
- Đổi màu/theme phụ.
- Sắp xếp sibling.
- Kéo card sang parent khác.
- Đường nối cập nhật ngay.
- Ngăn cycle.
- Có animation layout khi cây tái cấu trúc.

## 10.4. Drag reparent

### DnD interaction contract

- dnd-kit PointerSensor activation distance tránh drag khi click.
- KeyboardSensor có instructions và drop target parity.
- DragOverlay luôn dùng, đặc biệt nếu virtualization được bật.
- Collision strategy custom ưu tiên valid parent region + sibling insertion zone.
- Invalid target không chỉ màu đỏ; cursor/label/live region thông báo.
- Preview connector dùng SVG path riêng, không mutate data trước drop.
- On drop: optimistic geometry có thể chạy, nhưng Rust là authority; failure rollback về geometry cũ.
- Motion wrapper và DnD transform wrapper tách DOM để tránh cùng ghi `transform`.

### Cycle validation

Frontend loại target là descendant để UX nhanh; Rust query recursive CTE/path validation bắt buộc trước commit. Database không được dựa chỉ vào UI để ngăn cycle.


Khi kéo một node sang parent khác:

- Parent đích được highlight.
- Đường nối preview xuất hiện.
- Vị trí drop rõ ràng.
- Nếu không hợp lệ, có phản hồi rõ.
- Không cho node trở thành con của chính nó.
- Không cho tạo vòng lặp.
- Sau drop:
  - cây reflow;
  - đường nối animate;
  - vị trí scroll được giữ hợp lý.

## 10.5. Mức độ thu nhỏ

- Card trong Edit Mode nhỏ hơn Browse Mode.
- Nội dung card chỉ giữ:
  - icon;
  - tên;
  - trạng thái leaf/branch;
  - số con;
  - marker pinned.
- Không hiển thị mô tả dài.
- Không biến thành sơ đồ rối.

---

# 11. Anime Narrative Canvas

### Canonical content architecture

**LOCKED — Technology direction**

- Tiptap trên ProseMirror trong Studio Mode.
- Canonical document là versioned JSON, không phải Markdown/HTML.
- Scene là top-level structural node hoặc domain layer bao quanh ProseMirror content; schema cuối phải prototype để tránh editor model quá sâu.
- Custom React Node Views cho interactive blocks.
- Read Mode dùng Tiptap Static Renderer/custom renderer, không active editor.
- unified/remark pipeline phục vụ Markdown import/export.
- Asset reference bằng stable asset ID, không raw absolute path trong document.

### Vì sao JSON canonical

Scene preset, bento, motion, atmosphere, metric, gallery và dashboard không round-trip đầy đủ qua Markdown thuần. Markdown là interoperability format, không source of truth cho visual composition.


## 11.1. Định nghĩa

### Document boundaries

`ReaderDocument` quản lý template/theme/motion và ordered scenes. Mỗi `Scene` quản lý layout preset, atmosphere và ordered blocks. Rich-text block mới chứa ProseMirror subtree nếu kiến trúc scene-domain tách ngoài editor; hoặc toàn document là ProseMirror schema với scene nodes nếu prototype chứng minh transaction/DnD tốt hơn.

**PROTOTYPE-GATED:** hai schema strategy phải được thử bằng cùng fixture:

1. Scene/domain JSON bên ngoài + Tiptap cho rich text blocks.
2. Toàn bộ scene/block là ProseMirror document.

Đánh giá: DnD, undo, static render, migration, export, performance và khả năng AI sửa code. Không để Tiptap quyết định UX.


Leaf card không chỉ mở Markdown.

Nó mở một hệ thống nội dung phức tạp, có thể trình bày:

- Văn bản.
- Hình ảnh.
- Timeline.
- Bảng.
- Chỉ số.
- Sơ đồ.
- Bố cục nhiều cột.
- Bento.
- Dashboard.
- Dữ liệu có cấu trúc.
- Nội dung mang tính kể chuyện.

Tên tạm:

> **Anime Narrative Canvas**

## 11.2. Định hướng thị giác

Phong cách chính thức:

> **Abstract Anime Editorial**

Không dùng:

- Nhân vật anime cụ thể.
- Fanart.
- Giao diện gacha.
- UI cyberpunk neon dày đặc.
- Visual novel nhân vật đối thoại mặc định.

Dùng:

- Ánh sáng.
- Bầu trời.
- Tinh thể.
- Quỹ đạo.
- Sao.
- Cánh hoa trừu tượng.
- Đường năng lượng.
- Hình học.
- Không gian nhiều lớp.
- Typography như tạp chí tương tác.
- Motion giống opening/title sequence.

## 11.3. Cấu trúc scene

### Scene runtime contract

- Scene có stable UUIDv7.
- `layout_preset` là enum versioned, không arbitrary CSS string.
- `atmosphere` tham chiếu theme motif/config đã validate.
- `motion_preset` tham chiếu motion token/preset.
- Blocks có stable ID và order.
- Unknown future block không làm document không mở; renderer có unsupported placeholder an toàn.
- Scene migration chạy trong Rust/application migration layer hoặc content schema migrator có test fixtures.
- Reader chỉ mount scene gần viewport; height placeholder/measurement tránh scroll jump.


Trang là chuỗi scene dọc:

```text
Trang
├── Hero scene
├── Mục tiêu
├── Hiện trạng
├── Timeline
├── Dashboard
├── Nguyên tắc
├── Gallery
└── Kết luận
```

Mỗi scene:

- Có preset bố cục.
- Có background atmosphere.
- Có motion choreography.
- Có thể thêm/xóa.
- Có thể đổi thứ tự.
- Có thể kéo block giữa scene.

## 11.4. Preset bố cục scene

### Layout engine

- Preset hiện thực bằng CSS Grid template/areas + container queries.
- Free composition vẫn dùng constrained grid, không lưu x/y pixel mặc định.
- Grid spans, order và variant được validate theo preset schema.
- Block không được tự ghi style arbitrary làm vỡ responsiveness.
- Chuyển preset chạy compatibility mapping; block không tương thích vào overflow/default zone, không bị xóa.
- Studio preview có cùng renderer/layout contract với Read Mode để tránh “editor một kiểu, reader một kiểu”.


- Article.
- Split.
- Bento.
- Timeline.
- Dashboard.
- Comparison.
- Gallery.
- Focus.
- Free composition có ràng buộc.

Lưu ý:

- Không dùng canvas tự do theo pixel làm mặc định.
- Dùng grid có ràng buộc.
- Giữ responsiveness.
- Tránh việc nội dung vỡ khi đổi kích thước cửa sổ.

## 11.5. Loại block

### Block registry

Mỗi block type phải đăng ký trong registry typed:

```text
id / schemaVersion
validation schema
Studio editor component
Read renderer component
Markdown import/export adapter
plain-text extractor for search
asset dependency extractor
migration handlers
accessibility contract
performance class
```

Không cho plugin runtime từ internet. Registry compile-time/local only. Block dữ liệu phức tạp phải có text equivalent, keyboard interaction và static export behavior.


### Nội dung cơ bản

#### Implementation notes

- Heading/rich text/quote/list/code/formula qua Tiptap extensions đã whitelist.
- Link protocol allowlist; không cho `javascript:` hoặc unsafe custom schemes.
- Code block không chạy code.
- Formula renderer chỉ thêm dependency sau khi chọn KaTeX/MathJax bằng trace riêng; hiện **OPEN — Technology**.
- Attachment block dùng asset ID + metadata projection.


- Heading.
- Rich text.
- Quote.
- Callout.
- List.
- Code.
- Formula.
- Link.
- Attachment.

### Dữ liệu có cấu trúc

#### Structured blocks

- Table data model tách rõ header/rows/cells, không HTML blob.
- Timeline/milestone/KPI/comparison là schema typed.
- Progress/rating không tự liên kết Task trừ khi product chốt.
- Relationship map trong document không được lén trở thành cross-card graph đã loại.
- Mọi block có static read renderer và Markdown fallback đọc được.


- Table.
- Timeline.
- Milestone.
- Progress bar.
- Rating scale.
- KPI/stat.
- Comparison.
- Relationship map.
- Checklist không phải Task hằng ngày.

### Hình ảnh và trang trí

#### Asset/render policy

- Originals lưu filesystem, metadata SQLite.
- Preview WebP/AVIF tạo bởi Rust/background worker có bounded concurrency.
- SVG bundled phải sanitized/trusted build asset; user SVG cần sanitize hoặc rasterize theo policy.
- Decorative layers giới hạn 4 lớp toàn scene/theme.
- Không video background.
- Particle/orbit ưu tiên CSS/SVG; canvas chỉ khi benchmark chứng minh cần và có reduced-motion fallback.


- Ảnh đơn.
- Gallery.
- Cover.
- Icon.
- Sticker trừu tượng.
- Manga-style panel trừu tượng.
- Chapter divider.
- Highlight frame.
- Polaroid memory.
- Achievement badge.
- Constellation.
- Decorative line/orbit.

## 11.6. Không liên kết trực quan giữa leaf card

Đã chốt:

- Không cần block liên kết trực quan đến card khác.
- Không cần relationship graph nội bộ giữa leaf card trong Reader.
- Điều hướng cây và breadcrumb đã đủ.

## 11.7. Read Mode

### Read renderer và lazy scene

- Static Renderer nhận canonical JSON + extension registry.
- Không import Tiptap editor bundle trong initial Reader chunk nếu có thể code split.
- IntersectionObserver/useInView kích hoạt reveal; content phải hiện ngay hoặc nhanh ngay cả khi JS animation disabled.
- Scene ngoài viewport không chạy loop; unmount strategy cân bằng state/scroll.
- Background world là root layer liên tục; local atmosphere cross-fade bằng opacity/variables.
- Continuous scroll duy nhất, không pagination.
- Text selection, copy và link navigation hoạt động bình thường.


- Không toolbar.
- Không grid chỉnh sửa.
- Không khung node.
- Cuộn dọc liên tục.
- Motion nổi bật.
- Scene reveal theo scroll.
- Background biến đổi theo scene.
- Nội dung vẫn dễ đọc.
- Không chia thành slide/chapter phải click để chuyển.

## 11.8. Studio Mode

### Studio shell

- Tách route/chunk khỏi Task startup.
- Scene navigator, block library, canvas/grid và property panel có scroll ownership rõ.
- Tiptap editor instance chỉ cho document đang edit.
- Debounced autosave gửi versioned document patch/snapshot command; interval và recovery policy phải prototype.
- Save có optimistic local state nhưng Rust persistence + revision number là authority.
- DnD scene/block dùng dnd-kit; editor internal text DnD để ProseMirror quản lý.
- Không để dnd-kit bắt pointer trong editable text ngoài drag handle.
- Preview Read Mode dùng cùng persisted/canonical snapshot hoặc deterministic draft renderer.


Người dùng không tự thiết kế từ trắng hoàn toàn.

Quy trình:

1. Chọn template.
2. Chỉnh template.
3. Thêm/xóa scene.
4. Đổi preset.
5. Kéo block.
6. Chỉnh theme intensity.
7. Chọn motif.
8. Sắp xếp nội dung.

Studio Mode có thể gồm:

- Block library.
- Scene navigator.
- Grid/drop zone.
- Theme panel.
- Motion intensity.
- Zoom-out để nhìn cấu trúc trang.

## 11.9. Template-first

### Template system

- Template là versioned local JSON seed + renderer compatibility metadata.
- Tạo document từ template bằng Rust/application command để asset/reference consistent.
- Template update không tự rewrite document cũ.
- Chuyển template chạy dry-run compatibility report và tạo undoable transaction.
- Template assets bundled local; không marketplace/network.
- Bảy template cốt lõi là product seeds, không hard-code logic riêng rẽ nếu cùng block/preset engine biểu diễn được.


Mỗi leaf card bắt đầu từ template.

Người dùng:

- Chỉnh sâu.
- Không bị khóa.
- Không phải tự biết mọi nguyên tắc bố cục.
- Có thể chuyển template nhưng phải cố giữ nội dung tương thích.

## 11.10. Bảy template cốt lõi

### 1. Domain Profile — Hồ sơ lĩnh vực

Dùng cho:

- Tiếng Anh.
- Tài chính.
- Sức khỏe.
- Một domain tổng quát.

Scene:

- Hero.
- Mục tiêu.
- Hiện trạng.
- Điều cần tập trung.
- Điều cần tránh.
- Metric.
- Kết luận.

### 2. Roadmap — Lộ trình

Dùng cho:

- Học tập.
- Lab.
- Sự nghiệp.
- Kỹ năng.

Scene:

- Đích đến.
- Phase.
- Milestone.
- Dependency.
- Progress.
- Risk.

### 3. Principles — Hệ nguyên tắc

Dùng cho:

- Nguyên tắc cá nhân.
- Quy tắc sống.
- Cách ra quyết định.

Scene:

- Manifesto.
- Nhóm nguyên tắc.
- Ví dụ.
- Anti-pattern.
- Checklist.

### 4. Strategy Dashboard — Bảng chiến lược

Dùng cho:

- Mục tiêu định lượng.
- Phân bổ nguồn lực.
- Trạng thái chiến lược.

Scene:

- KPI.
- Progress.
- Resource allocation.
- Status table.
- Priority.
- Review.

### 5. Decision Studio — Ra quyết định

Dùng cho:

- So sánh phương án.
- Quyết định quan trọng.

Scene:

- Vấn đề.
- Tiêu chí.
- Phương án.
- Ma trận.
- Trade-off.
- Kết luận.

### 6. Knowledge Dossier — Hồ sơ kiến thức

Dùng cho:

- Nghiên cứu.
- Chủ đề học thuật.
- Kỹ năng.

Scene:

- Khái niệm.
- Sơ đồ.
- Nguồn.
- Bảng.
- Công thức/code.
- Câu hỏi mở.
- Kết luận.

### 7. Personal Vision — Tầm nhìn cá nhân

Dùng cho:

- Mục tiêu dài hạn.
- Viễn cảnh cuộc sống.

Scene:

- Hero statement.
- Vision.
- Value.
- Abstract visual.
- Long-term timeline.
- Core reminder.

---

# 12. Hệ thống theme Abstract Anime Editorial

### Theme engine

**LOCKED — Technology**

- vanilla-extract `createThemeContract` cho core semantic contract.
- Mỗi visual world implement đầy đủ contract; thiếu token là TypeScript/build error.
- CSS custom properties cho runtime branch switching.
- OKLCH authoring, Culori build-time gamut mapping/contrast validation, sRGB output bắt buộc.
- Light/dark là global appearance layer; branch world là thematic layer. Hai layer không được tạo combinatorial CSS không kiểm soát.
- Theme config lưu stable world ID + accent/motif/intensity, không raw CSS.
- Dynamic user accent đi qua validated palette generator và `assignInlineVars` nếu cần.

### Token hierarchy

```text
primitive palette
→ global semantic light/dark
→ branch world semantic overrides
→ component semantic states
→ motion/material intensity
```

Component không đọc primitive `azure500` trực tiếp.


## 12.1. Theme theo branch

### Inheritance

- Top-level branch giữ `branch_theme_id`.
- Descendant inherit, leaf chỉ có bounded variant/intensity.
- Theme resolution là pure function/cacheable: global appearance + branch world + leaf variant.
- Move node sang branch mới cập nhật resolved theme, nhưng document content không bị mutate.
- Pinned card khi hiển thị ngoài branch vẫn giữ recognizable accent nhưng phải hòa với container.
- Search result không render full world; chỉ accent/icon token để tránh nặng.


Không cho từng leaf card tự chọn theme hoàn toàn độc lập.

Quy tắc:

- Branch cấp cao quyết định visual world.
- Leaf card được biến thể có kiểm soát.
- Cùng branch phải có:
  - palette chung;
  - material chung;
  - motion language chung;
  - motif chung.

## 12.2. Visual world mặc định

### Asset và performance contract cho visual worlds

Mỗi world package gồm:

- semantic palette light/dark;
- gradient recipes;
- motif SVG/procedural definitions;
- material/elevation recipes;
- motion direction/preset references;
- optional optimized textures;
- contrast test fixtures;
- screenshot fixtures.

Không world nào được chứa remote URL, video hoặc shader bắt buộc. Asset budget theo world phải được đo trong bundle report.


### Life root — Celestial Nexus

- Palette tổng hợp nhưng giảm bão hòa.
- Luồng sáng tách thành các branch.
- Cảm giác trung tâm vũ trụ.

### Học tập — Azure Observatory

- Xanh trời.
- Trắng lạnh.
- Tím nhạt.
- Bầu trời.
- Bản đồ sao.
- Lăng kính.
- Motion hướng lên.

### Sự nghiệp/Lab — Midnight Research Grid

- Xanh đêm.
- Cyan nhạt.
- Bạc.
- Grid không gian.
- Đường dữ liệu.
- Bản vẽ kỹ thuật.
- Chính xác nhưng không neon quá mạnh.

### Tài chính — Amber Vault

- Than đen.
- Vàng hổ phách.
- Kem.
- Vòng đồng tâm.
- Đường biểu diễn tinh giản.
- Kính tối.
- Cảm giác tích lũy và ổn định.

### Sức khỏe — Verdant Pulse

- Xanh lá sâu.
- Xanh ngọc.
- Trắng ấm.
- Sóng sinh học.
- Vòng nước.
- Lá trừu tượng.
- Không giống fitness dashboard thông thường.

### Quan hệ/Tình yêu — Rose Nebula

- Tím đỏ.
- Hồng bụi.
- Xanh đêm.
- Dải sáng giao nhau.
- Quỹ đạo đôi.
- Cánh hoa trừu tượng.
- Không dùng trái tim trực tiếp.

## 12.3. Branch mới

### World library

- Library local 6–8 world ban đầu là **OPEN — UX quantity**, engine hỗ trợ registry.
- User chọn world, accent và motif trong bounded options.
- Advanced full palette customization DEFERRED.
- Preview theme dùng isolated surface, không ghi DB đến khi Save/Apply.
- Theme selection command undoable và update query/theme cache.


- Chọn một visual world từ library khoảng 6–8 world.
- Chỉnh accent.
- Chỉnh motif.
- Không mở full custom palette cho người dùng phổ thông.
- Advanced customization có thể để sau.

## 12.4. Background liên tục

### Layer implementation

Tối đa bốn layers:

1. base color/gradient: CSS background;
2. atmosphere: pseudo/SVG/raster optimized;
3. structure: grid/orbit/line SVG;
4. foreground accent: limited decorative elements.

- Layers dùng `pointer-events:none`, `aria-hidden`.
- Cross-fade qua opacity/CSS variables.
- Không animate filter blur lớn liên tục.
- `contain` dùng cẩn thận để không phá sticky/portal.
- Ambient layer pause khi document hidden, scene offscreen hoặc Reduced Motion.
- Memory profile phải kiểm tra texture decode và compositing layers.


Nguyên tắc:

> Continuous world, local atmosphere.

- Toàn trang có nền gốc của branch.
- Mỗi scene có atmosphere riêng.
- Chuyển scene bằng cross-fade và biến đổi dần.
- Không đổi theme đột ngột.

Bốn lớp tối đa:

1. Base color/gradient.
2. Atmospheric layer.
3. Structural layer.
4. Foreground accent.

Không dùng video background.

---

# 13. Motion, chuyển cảnh và phản hồi giao diện

### Motion system architecture

**LOCKED — Technology**

- Motion for React cho layout, `layoutId`, presence, springs, scroll-trigger/link và gestures cần thiết.
- CSS transitions/keyframes cho hover/focus, color, opacity và ambient loop đơn giản.
- Web Animations API chỉ cho imperative animation nhỏ hoặc animation không cần React render.
- `MotionConfig` đặt reducedMotion, duration/spring defaults.
- `LazyMotion` giảm bundle nơi phù hợp.
- Không thêm GSAP vào core. GSAP chỉ được ADR/prototype nếu sequence đặc biệt không thể biểu diễn sạch.

### Motion ownership

Mỗi element chỉ có một owner của `transform`. DnD và Motion dùng nested wrappers; CSS hover không ghi transform lên node đang layout-animate nếu gây conflict.


## 13.1. Mức motion

### Mapping Calm / Expressive / Cinematic

| Level | Micro | Layout | Scene | Ambient |
|---|---|---|---|---|
| Calm | ngắn, ít scale | fade/translate nhẹ | reveal tối giản | gần như tắt |
| Expressive | default | spring vừa | stagger/layer có kiểm soát | loop chậm một focal motion |
| Cinematic | không làm control chậm | chỉ scene đặc biệt | hero/mask/depth phong phú | vẫn bounded, không toàn màn hình |

System Reduced Motion override các level: transform lớn/parallax/auto-loop chuyển thành fade/color hoặc tắt.


Ba cường độ:

- Calm.
- Expressive.
- Cinematic.

Mặc định:

- Expressive.

Cinematic:

- Chỉ nên dùng Hero hoặc scene đặc biệt.

## 13.2. Page transition

### Shared-element constraints

- `layoutId` namespace theo route/document để tránh collision.
- Source và destination có border radius/material compatible.
- Image/title continuity ưu tiên; không scale body text dài gây blur.
- Transition không giữ hidden DOM khổng lồ.
- Route data load có skeleton/placeholder cùng geometry; không flash blank.
- Back transition phải chấp nhận source card offscreen: fallback fade deterministic.
- Input disabled chỉ ở element đang chuyển, không khóa app toàn bộ.


Khi mở leaf card:

1. Card phóng lớn.
2. Card khác mờ và lùi sâu.
3. Background branch lan ra.
4. Title giữ continuity.
5. Card biến thành hero.
6. Reader bắt đầu.

## 13.3. Scene reveal

### Reveal policy

- Nội dung cốt lõi không phụ thuộc animation để trở nên tồn tại.
- Intersection threshold và once/repeat policy nằm trong preset.
- Không stagger hàng trăm children; giới hạn count/time window.
- Count-up có accessible final value ngay và không spam announcements.
- Parallax chỉ decorative, amplitude nhỏ, tắt Reduced Motion.
- Mask reveal phải có fallback CSS đơn giản.
- Scroll-linked animation đọc MotionValue, không set React state mỗi frame.


Có thể dùng:

- Fade + translate.
- Stagger.
- Draw line.
- Count-up.
- Parallax.
- Mask reveal.
- Layered depth.

Không dùng:

- Glitch mạnh.
- Rung.
- Spin chữ.
- Zoom liên tục.
- Chữ dài parallax quá mức.

## 13.4. Ambient motion

### Runtime budget

- Một focal ambient motion mỗi màn hình.
- Loop 10–30 giây.
- Chỉ transform/opacity/gradient position đã benchmark.
- Pause offscreen/hidden/minimized.
- Không tạo timer riêng cho từng particle; dùng một compositor-friendly animation hoặc CSS.
- Particle count và texture size có upper bound.
- Reader không được duy trì GPU usage cao khi người dùng đứng yên.


- Particle trôi chậm.
- Gradient dịch nhẹ.
- Orbit chuyển động.
- Crystal parallax nhẹ.
- Highlight chạy qua bề mặt.

Quy tắc:

- Một điểm chuyển động nổi bật nhất mỗi màn hình.
- Không để toàn bộ màn hình chuyển động cùng lúc.
- Loop dài khoảng 10–30 giây.

## 13.5. Timing

### Motion tokens

```text
micro.fast      150 ms
micro.normal    200–250 ms
control.open    250–400 ms
layout.normal   300–500 ms
scene.normal    500–800 ms
ambient         10–30 s
```

Các con số là range định hướng, không hard-code trực tiếp. Easing/spring token theo ý nghĩa: enter, exit, emphasis, layout, drag settle. Exit thường ngắn hơn enter. Test animation deterministic có thể override duration/clock.


Gợi ý:

- Microinteraction: 150–250 ms.
- Popup/open control: 250–400 ms.
- Layout transition: 300–500 ms.
- Scene transition: 500–800 ms.
- Ambient: 10–30 s.

## 13.6. Reduced Motion

### Accessibility implementation

- Đọc `prefers-reduced-motion` và Windows preference qua WebView/CSS; app setting có thể giảm thêm, không ép tăng vượt system preference.
- Motion `useReducedMotion` cho custom behavior.
- Không chỉ đặt duration 0 gây jump; thay choreography bằng fade/state transition.
- Drag, focus, error feedback vẫn rõ khi motion giảm.
- Automated tests chạy cả normal và reduced modes.


Bắt buộc:

- Có setting.
- Tôn trọng Windows reduced motion.
- Thay parallax/transform bằng fade hoặc đổi màu nhẹ.
- Không làm mất nội dung.
- Không làm app khó dùng nếu motion bị giảm.

## 13.7. Âm thanh

Không sử dụng trong phiên bản chính:

- Không click sound.
- Không hoàn thành sound.
- Không page-open sound.
- Không ambient music.
- Không reminder sound.

---

# 14. Settings

### Settings architecture

- Settings schema versioned trong SQLite.
- UI form dùng React Aria/Radix primitives bọc nội bộ.
- Draft state local; Apply/Save theo section hoặc immediate command tùy risk.
- Theme/motion có live preview nhưng commit rõ.
- Destructive archive/delete có AlertDialog và recovery path.
- Setting thay đổi algorithm/theme ảnh hưởng dữ liệu phải hiển thị scope.
- Settings không trở thành developer console; advanced internals ẩn.


## 14.1. Category Settings

### UI và command

- Searchable/sortable list; dnd-kit chỉ nếu manual reorder giữ trong scope.
- Icon picker local, color picker bounded OKLCH palette.
- Duration minimum/target dùng duration controls, không bắt nhập raw minutes.
- Archive thay delete khi có history.
- Preview category marker trong Task và Analytics.
- Commands granular, transaction bảo toàn order/invariants.


Cho phép:

- Tạo.
- Xóa.
- Đổi tên.
- Chọn icon.
- Chọn màu.
- Đặt thời lượng tối thiểu tuần.
- Đặt thời lượng mục tiêu tuần.

## 14.2. Completion State Settings

### Radial configuration preview

- Preview dùng cùng production RadialFan component với mock state.
- Reorder state không đổi historical snapshot.
- Hidden mapping editor có guardrails, explanatory text, min/max và monotonic validation nếu áp dụng.
- Không expose raw percentages trong everyday Task UI.
- Archive state used; ít nhất một active state bắt buộc.


Cho phép:

- Đổi tên.
- Thêm/bớt.
- Sắp thứ tự.
- Chọn icon/màu nếu cần.
- Gán giá trị số ẩn.
- Xem preview radial fan.

## 14.3. Scoring Settings

Chưa chốt mức người dùng được chỉnh.

Tối thiểu:

- Hiển thị mô tả tổng quát.
- Cho bật/tắt một số yếu tố nếu sau này cần.
- Không bắt người dùng chỉnh công thức phức tạp.
- Thuật toán nên có default mạnh.

## 14.4. Appearance

### Appearance storage

- `appearance_mode`: system/light/dark.
- `accent_id` hoặc validated accent parameters.
- `motion_level`: calm/expressive/cinematic.
- `reduce_motion_override`: inherit/reduce.
- `density`: chỉ thêm nếu prototype chứng minh cần.
- Theme class gắn root; tránh re-render toàn component tree.
- Font loading local; fallback metrics được tối ưu để giảm layout shift.


- Light.
- Dark.
- System.
- Accent.
- Motion level.
- Reduced Motion.
- Density nếu cần.

## 14.5. Life System

- Visual world library.
- Branch theme.
- Default template.
- Motion intensity.
- Pinned management.

## 14.6. Backup

### Backup UI integration

- Backup/restore là first-class Settings section.
- Progress qua Tauri Channel.
- Chọn destination bằng native file dialog capability scoped.
- Backup result hiển thị path, size, timestamp, checksum status.
- Restore yêu cầu preview manifest/version, confirmation và automatic pre-restore backup.
- Không hiển thị technical log dài mặc định; có diagnostic detail expandable.


- Backup database.
- Restore.
- Export Markdown.
- Import Markdown.
- Hiển thị vị trí file.
- Không cần cloud.

---

# 15. Mô hình dữ liệu khái niệm

### Data architecture tổng thể

**LOCKED — Technology; schema chi tiết cần migration design**

- SQLite source of truth.
- `rusqlite` bundled.
- Dedicated SQLite worker thread với bounded queue.
- Repository viết tay, parameterized SQL; không ORM.
- Migration forward-only bằng `rusqlite_migration`.
- UUIDv7 sinh Rust.
- Timestamp instant lưu UTC cho created/updated/evaluated; local-date/time lưu riêng cho scheduling.
- Archive/Trash bảo toàn history.
- JSON chỉ dùng cho versioned document/config phức tạp, không thay relational model cho mọi thứ.
- FTS5 index derived/rebuildable.
- Aggregates derived/rebuildable.

### Connection policy

- Một writer connection lâu dài trên worker.
- Read strategy benchmark: cùng worker hoặc bounded read connection; không pool tùy tiện.
- PRAGMA set và assert khi mở connection.
- Busy timeout explicit.
- WAL checkpoint policy có metrics.
- Integrity check trong restore/diagnostics, không chạy nặng mỗi startup.


> Đây là mô hình khái niệm, không phải schema SQL cuối cùng.

## 15.1. Task

### Task relational contract dự kiến

```text
tasks
- id TEXT/UUID PK
- title TEXT NOT NULL
- description TEXT NOT NULL DEFAULT ''
- local_date TEXT NOT NULL
- start_minute INTEGER NOT NULL
- end_minute INTEGER NOT NULL
- category_id FK
- priority INTEGER/enum
- recurrence_series_id nullable FK
- occurrence_key nullable
- time_slot_group_id nullable FK
- archived_at nullable
- created_at / updated_at UTC
- revision INTEGER
```

Evaluation không nên nhồi toàn bộ vào task nếu cần history/snapshot; dùng `task_evaluations`. CHECK cho minute range; indexes theo date/category/series/group. Final SQL chỉ chốt sau query plan prototype.


Thuộc tính:

- id.
- title.
- description.
- date.
- start_time.
- end_time.
- category_id.
- priority.
- recurring_rule_id.
- completion_state_id.
- completion_value_hidden.
- evaluated_at.
- missed.
- group/time-slot identity.
- created_at.
- updated_at.

## 15.2. Category

### Category storage

- Unique name policy cần case/Unicode normalization quyết định rõ.
- `icon_key`, `color_config`, minimum/target minutes, sort key, archived_at.
- Không cascade delete task khi archive category.
- Historical analytics dùng category ID/record tồn tại.
- FTS/tag search index category name nếu global search scope chốt.


- id.
- name.
- icon.
- color.
- weekly_minimum_minutes.
- weekly_target_minutes.
- order.
- active.

## 15.3. Completion State

### Completion schema

- Stable ID/internal key.
- User label.
- hidden value fixed-point.
- sort key.
- visual token JSON/fields đã validate.
- archived_at.
- created/updated timestamps.

`task_evaluations` giữ snapshot label/value/visual semantic tối thiểu để mapping đổi không phá lịch sử.


- id.
- label.
- hidden_value.
- order.
- visual token.
- active.

## 15.4. Recurrence Rule

### Recurrence tables

```text
recurrence_series
recurrence_rdates
recurrence_exdates
recurrence_overrides
```

RRULE canonical string có thể lưu cùng parsed/versioned fields tùy query needs. Override liên kết occurrence key deterministic. Split series phải transactionally close old/create new. Không lưu hàng triệu occurrence tương lai.


- id.
- pattern.
- start.
- end nếu có.
- exceptions.
- instance overrides.
- materialization theo tháng.

## 15.5. Life Node

### Tree storage

- Adjacency list `parent_id` là model chính.
- Stable sibling sort key.
- Root invariant rõ.
- Recursive CTE cho ancestry/path/cycle validation.
- Optional path cache chỉ derived và update transactionally nếu profile cần.
- Branch theme stored at appropriate high-level node.
- `is_leaf` có thể derive từ children/document; tránh flag mâu thuẫn nếu không cần.
- Archive policy bảo toàn subtree; UI phải chốt cascade behavior trước SQL final.


- id.
- parent_id.
- title.
- short_description.
- icon.
- branch_theme.
- order.
- pinned.
- is_leaf.
- reader_document_id.
- created_at.
- updated_at.

## 15.6. Reader Document

### Document persistence

- `document_json` versioned canonical JSON hoặc normalized scene/block tables + JSON rich text theo prototype result.
- `schema_version`, `revision`, template ID/version, theme config, motion level.
- Optimistic concurrency qua revision để tránh overwrite stale editor state.
- Autosave snapshot có size limits/compaction strategy.
- Search text extracted riêng vào FTS, không query JSON mỗi search.
- Asset references extracted để backup/orphan cleanup.


- id.
- template_type.
- branch_theme.
- scene_order.
- content tree.
- motion level.
- motif.
- background configuration.

## 15.7. Scene

### Scene/block storage options

**PROTOTYPE-GATED:**

A. normalized `scenes`/`blocks` tables với payload JSON per block; hoặc  
B. toàn document JSON snapshot.

Tiêu chí chọn: atomic undo, reorder cost, partial update, migration, backup, FTS extraction, file size, editor integration. Không normalize chỉ vì “database chuẩn” nếu làm editor transaction phức tạp vô ích; không blob hóa mọi thứ nếu phá search/migration.


- id.
- layout preset.
- atmosphere.
- motion preset.
- block list.
- order.

## 15.8. Analytics Aggregate

### Aggregate tables

- Daily, weekly, monthly, yearly có thể tách bảng hoặc generic period table.
- Lưu source revision/range, algorithm_version.
- Update trong transaction hoặc dirty-range queue.
- Rebuild tool có progress channel và test đối chiếu raw computation.
- Aggregate không là nguồn duy nhất; raw task/evaluation luôn đủ phục hồi.


Có thể tính động hoặc cache:

- daily score.
- weekly score.
- monthly score.
- yearly score.
- category minutes.
- minimum attainment.
- target attainment.
- streak state.
- missed count.
- completion distribution.

---

# 16. Các hành vi biên và quy tắc nhất quán

### Command/transaction/undo framework

Mọi edge behavior phải được hiện thực ở Rust application service, không chỉ UI.

- Một user intent = một command transaction.
- Result gồm changed entity revisions, invalidation hints và undo token khi áp dụng.
- Undo domain dùng inverse command/hybrid history; text editing dùng ProseMirror history riêng.
- Delete quan trọng vào Trash/archive.
- Không full event sourcing.
- Không snapshot toàn DB mỗi action.
- Undo stack có scope/window và invalidation policy; không lưu vĩnh viễn vô hạn.


## 16.1. Task cùng khung giờ

- Chỉ gộp nếu start/end giống nhau.
- Mỗi task vẫn độc lập.
- Priority quyết định thứ tự.
- Đánh giá riêng.

## 16.2. Xung đột giờ

- Không cho tạo overlap thường.
- Bộ chọn chỉ hiện khoảng hợp lệ.
- Nếu muốn cùng giờ, thêm vào group hiện tại.
- Không dùng cảnh báo sau cùng làm cơ chế chính.

## 16.3. Task recurring bị chỉnh

Luôn hỏi phạm vi:

- Lần này.
- Từ lần này.
- Toàn bộ.

## 16.4. Task chưa đánh giá khi hết ngày

- Auto missed.
- Không reschedule.
- Không ẩn.
- Không xóa.
- Không đưa ra khỏi vị trí.

## 16.5. Trạng thái completion bị xóa trong Settings

### Enforcement

Repository từ chối hard delete khi referenced. Archive command giữ record. Evaluation snapshot là bất biến. Import có unknown/archived mapping strategy và không tự map sai theo label trùng.


Cần xử lý bảo toàn lịch sử:

- Không xóa cứng nếu đã được dùng.
- Có thể archive.
- Task cũ giữ label/value lịch sử.
- Mapping mới chỉ áp dụng cho lần đánh giá mới.

## 16.6. Category bị xóa

### Enforcement

Archive category; task cũ vẫn join được. New task không chọn archived category. Restore category undoable. Nếu user yêu cầu purge thật trong tương lai, đó là destructive maintenance riêng với export/confirmation.


- Không phá dữ liệu cũ.
- Archive category.
- Task cũ vẫn hiển thị icon/màu lưu lịch sử hoặc category archived.
- Không làm Analytics cũ thay đổi ngoài ý muốn.

## 16.7. Đổi parent Life Node

### Reparent transaction

- validate source/target active;
- target không phải source/descendant;
- update parent/sort order;
- preserve pinned/document;
- mark path/search/breadcrumb caches dirty;
- return affected subtree IDs/old-new paths;
- inverse command chứa old parent/order;
- transaction rollback toàn bộ nếu bất kỳ bước thất bại.


- Ngăn cycle.
- Giữ document leaf.
- Giữ pinned.
- Cập nhật breadcrumb.
- Cập nhật path cache nếu có.

## 16.8. Node có con bị biến thành leaf

Chưa chốt UX; cần không làm mất child. Phải:
- cấm trực tiếp;
- hoặc yêu cầu di chuyển/xóa child trước.

## 16.9. Reader content dài

### Long-document safeguards

- Static Read renderer.
- Scene-level lazy mount/visibility.
- Asset decode lazy.
- Search extraction/background processing ngoài UI thread.
- Không pagination.
- Scroll restoration by scene/block anchor.
- Performance fixtures: 10, 50, 200 scenes; large images; long tables/code.
- Autosave không serialize toàn document trên mỗi keystroke nếu profile cho thấy quá nặng.


- Cuộn liên tục.
- Không dùng pagination.
- Scene lazy-render nếu cần.
- Không để motion làm chậm scroll.

---

# 17. Những chức năng đã chủ động loại bỏ hoặc giảm ưu tiên

### Dependency và scope firewall

Các chức năng REMOVED phải được bảo vệ bằng dependency policy và acceptance tests. Không thêm package notification, auth, cloud SDK, collaboration CRDT hoặc telemetry “để sau dùng”. Mỗi dependency mới phải trả lời:

1. Feature nào đã chốt cần nó?
2. Có chạy/phone-home khi runtime không?
3. Bundle/memory/performance cost?
4. License và maintenance?
5. Có phương án nhỏ hơn/native hơn?
6. Có làm sản phẩm lệch khỏi Task + Life System?

Các chức năng DEFERRED không được nằm trong critical path, schema bắt buộc hoặc navigation chính.


## 17.1. Không có

- Tài khoản.
- Đăng nhập.
- Server.
- Cloud sync mặc định.
- Collaboration.
- Sharing workspace.
- Phân quyền.
- Comment.
- Presence.
- Subscription.
- Paywall.
- Reminder.
- Windows notification.
- Âm thanh.
- App-open streak.
- Task card.
- Task detail panel bên phải.
- Task score trên Today.
- Dashboard làm màn hình khởi động.
- Month calendar cố định cạnh timeline.
- Full tree trong Browse Mode.
- Nhân vật anime cụ thể.
- Gacha UI.
- Freeform pixel canvas mặc định.

## 17.2. Không làm quá sớm

- Graph cực phức tạp.
- Agent AI tự động quyết định thay người dùng.
- Hệ thống gamification vụn vặt.
- Timeline time tracker realtime nếu chưa cần.
- Custom theme tự do hoàn toàn.
- Sound design.

---

# 18. Các chức năng nền tảng từ tầm nhìn ban đầu

### Trạng thái công nghệ của các chức năng chưa khóa UX

| Chức năng | Trạng thái UX | Nền kỹ thuật đã chuẩn bị |
|---|---|---|
| Outline | OPEN | Life tree projection + d3-hierarchy/React Aria Tree nếu giữ. |
| Noteboard | OPEN | Ordered CSS Grid + dnd-kit + TanStack Virtual lanes khi lớn. |
| Backlinks | OPEN | Relational links + SQLite projection; panel custom. |
| Search | Nền tảng giữ | SQLite FTS5 + normalized Vietnamese fields. |
| Tags | OPEN | Relational many-to-many + typed filter AST. |
| Graph | DEFERRED/OPEN | Graphology + Sigma.js 3 + ForceAtlas2 worker, lazy bundle. |
| Import/export Markdown | Giữ | unified/remark + manifest/assets + round-trip tests. |
| Today/Calendar | LOCKED | Custom views như tài liệu. |
| Upcoming/Overdue | OPEN | Query views; Overdue hiện chủ yếu là Missed. |

Không đưa các mục OPEN vào sidebar hoặc schema bắt buộc trước khi có quyết định sản phẩm.


Các chức năng sau xuất hiện trong tầm nhìn ban đầu và chưa bị loại bỏ hoàn toàn, nhưng trọng tâm hiện tại là Task + Life System:

- Sidebar.
- Outline.
- Noteboard.
- Markdown card bo tròn.
- Màu/icon.
- Parent–child hierarchy.
- Drag-and-drop.
- Backlinks.
- Search.
- Tags.
- Graph.
- Import/export Markdown.
- Today.
- Upcoming.
- Overdue.
- Deadline.
- Priority.
- Recurring.

Cần lưu ý:

- Task hiện được định nghĩa bằng ngày + start/end time, không phải card.
- Overdue thực tế được biểu diễn bằng “Bỏ lỡ” khi qua ngày.
- Reminder đã bị loại bỏ.
- Outline/Noteboard/backlinks/search/tags/graph chưa được thiết kế chi tiết trong chuỗi thảo luận này.
- Chúng phải được rà soát lại để tránh làm app phình phạm vi.
- Nếu giữ, nên phục vụ Life System hoặc tìm kiếm toàn cục, không làm loãng hai trụ cột.

---

# 19. Luồng sử dụng tiêu biểu

### Quy tắc mô tả flow tích hợp

Mỗi flow bên dưới phải được implement như một chuỗi user intent và domain command rõ ràng. UI choreography có thể optimistic, nhưng persistence chỉ hoàn tất khi Rust transaction thành công. Mọi flow critical có test theo ba lớp:

- component/interaction;
- Rust/database integration;
- desktop E2E smoke.


## 19.1. Lập kế hoạch hôm nay

### Command sequence kỹ thuật

```text
Open app
→ load settings + TodayProjection
→ auto-scroll near now
→ OpenCreateTaskDialog
→ load valid intervals/categories
→ user edits local form
→ CreateTask command
→ transaction + aggregate update
→ optimistic reconcile
→ focus/announcement success
```

E2E phải đóng/mở app và xác nhận task còn nguyên.


1. Mở app.
2. Today xuất hiện.
3. Timeline tự cuộn gần giờ hiện tại.
4. Bấm icon tạo task ở góc.
5. Popup trung tâm mở.
6. Nhập title/description.
7. Chọn category bằng icon.
8. Chọn priority.
9. Kéo wheel giờ bắt đầu/kết thúc.
10. Chọn recurring nếu cần.
11. Lưu.
12. Task xuất hiện đúng buổi.

## 19.2. Gộp task cùng giờ

### Group flow

UI chỉ cho “thêm vào group” khi exact slot tồn tại. Command `CreateTaskInTimeSlotGroup` hoặc `CreateTask` với group intent được Rust xác minh. Không dùng overlap warning muộn như đường chính. Sau save, projection group sort theo priority deterministic và layout reflow mượt.


1. Mở popup.
2. Chọn một time slot đã có.
3. Hệ thống hiểu là thêm vào group.
4. Task mới nằm dưới cùng time cell.
5. Hệ thống auto-sort theo priority.

## 19.3. Đánh giá task

### Evaluation flow

Trigger → radial fan portal → roving focus/pointer selection → optimistic ring update → EvaluateTask transaction → aggregates invalidated → undo available. Latency, keyboard parity, edge collision và Reduced Motion đều có test riêng.


1. Task kết thúc.
2. Bấm vòng tròn bên phải.
3. Fan mở.
4. Trạng thái dự đoán cao nhất lớn nhất.
5. Bấm một trạng thái.
6. Lưu.
7. Vòng tròn cập nhật.
8. Analytics cập nhật.

## 19.4. Sửa task

### Edit flow

Double-click/keyboard command mở dialog với revision hiện tại. Save gửi expected revision để phát hiện stale update. Recurring task bắt buộc chọn scope trước commit. Conflict engine chạy lại. Undo token giữ previous snapshot hoặc inverse payload tối thiểu.


1. Double-click hàng.
2. Popup mở giữa màn hình.
3. Chỉnh dữ liệu.
4. Nếu recurring:
   - chọn phạm vi.
5. Lưu.

## 19.5. Xóa task

### Delete/archive flow

Delete mặc định vào Trash/archived state, không hard delete. Confirmation chỉ khi hậu quả khó đảo hoặc recurring scope rộng; thao tác đơn lẻ có thể dùng undo thay confirmation nếu UX chốt. Aggregates/search index cập nhật transactionally.


1. Double-click.
2. Popup edit.
3. Bấm Delete.
4. Xác nhận nếu cần.
5. Không có quick swipe/menu chuột phải bắt buộc.

## 19.6. Xem lịch tháng

### Calendar flow

MonthProjection query một lần, recurring expansion giới hạn range. Click/activate day cập nhật route/selected date và fetch DayProjection. Create chỉ từ day view. Back giữ month/scroll/focus anchor.


1. Chọn Calendar.
2. Xem task count, duration, category icon, morning/afternoon/evening load.
3. Bấm ngày.
4. Timeline ngày đó mở.
5. Sau đó mới tạo task.

## 19.7. Duyệt Life System

### Browse flow

Load last valid node → selected + children projection → child activation → shared-element navigation → update history/breadcrumb → leaf preload/render Reader. Không load full tree hoặc editor trong flow này.


1. Chọn Life System.
2. Sidebar thu gọn.
3. Node cuối cùng được phục hồi.
4. Xem selected node + children.
5. Bấm child.
6. Child chuyển lên.
7. Children mới xuất hiện.
8. Nếu leaf:
   - card mở thành Reader.

## 19.8. Chỉnh cây

### Edit flow

Load tree projection → calculate d3 geometry → render HTML/SVG → DnD preview → Reparent command → cycle validation transaction → reflow Motion → preserve anchor → undo available. Desktop E2E dùng tree fixture nhiều tầng.


1. Vào Edit Mode.
2. Toàn bộ cây thu nhỏ hiển thị.
3. Cuộn dọc.
4. Kéo node.
5. Drop vào parent mới.
6. Đường nối animate.
7. Lưu.

## 19.9. Chỉnh trang leaf

### Studio flow

Open Reader → enter Studio → lazy load editor → acquire latest revision → edit scenes/blocks → debounced persistence/revision → preview static renderer → explicit leave guard nếu unsaved/error → close editor resources. Recovery fixture phải mô phỏng app crash giữa autosave.


1. Mở leaf.
2. Chuyển sang Studio Mode.
3. Chọn template hoặc chỉnh template hiện tại.
4. Thêm/xóa scene.
5. Kéo block.
6. Chỉnh motif/motion.
7. Preview Read Mode.
8. Lưu.

---

# 20. Tiêu chí nghiệm thu UX cấp cao

### Mapping acceptance → test evidence

Mỗi tiêu chí UX phải có ít nhất một evidence type:

| Loại | Công cụ |
|---|---|
| Logic TS | Vitest |
| Component DOM/browser | React Testing Library + Vitest Browser Mode |
| Accessibility | axe-core + keyboard scripts + manual screen reader spot checks |
| Rust/domain | built-in Rust tests + cargo-nextest + proptest |
| SQLite | temp DB integration + migration/backup round-trip |
| Desktop | WebdriverIO Tauri service |
| Visual | Playwright same-Windows/WebView baseline |
| Performance | React Performance Tracks, User Timing, tracing, Criterion |

Không đánh dấu “done” chỉ bằng screenshot đẹp.


## 20.1. Task

### Evidence bổ sung

- cold/warm open timing;
- one-click radial open + one activation select;
- exact-minute wheel keyboard/pointer;
- conflict property tests;
- 1, 20, 200 task row fixtures;
- current-time line at DPI 100–200%;
- no card shadow visual snapshot;
- close/reopen persistence.


- Mở app đến Today không quá một bước.
- Tạo task không cần nhập số giờ bằng bàn phím.
- Không tạo được giờ không hợp lệ.
- Group cùng giờ hiển thị rõ.
- Task không có cảm giác card.
- Mô tả đọc được ngay.
- Priority hiện nhưng không lấn át.
- Đánh giá radial dùng được bằng một click mở + một click chọn.
- Missed tự động và giữ lịch sử.
- Timeline current time không phá thẩm mỹ.

## 20.2. Analytics

- Điểm tuần là trọng tâm.
- Không xuất hiện trong Today.
- Có thể hiểu category nào thiếu thời gian.
- Mức tối thiểu và mục tiêu tách biệt.
- Streak ít nhưng có ý nghĩa.
- Màu điểm hỗ trợ chứ không thống trị.

## 20.3. Life System Browse

### Evidence bổ sung

- two-level invariant test;
- transition screenshots/key frames;
- focus after child navigation;
- back restores node/scroll;
- high child count responsive prototype;
- Reduced Motion variant.


- Mỗi màn hình chỉ hai tầng.
- Không mất phương hướng.
- Chuyển node mượt.
- Card trung gian ngắn gọn.
- Leaf mở thành Reader liền mạch.

## 20.4. Life System Edit

### Evidence bổ sung

- cycle attempts rejected frontend + Rust;
- pointer and keyboard reparent;
- connector geometry after resize/DPI;
- scroll anchor after reflow;
- 100/1.000 node benchmark thresholds;
- undo reparent restores exact parent/order.


- Full tree đọc được.
- Kéo reparent tự nhiên.
- Không tạo cycle.
- Đường nối update mượt.
- Không giống admin tool thô.

## 20.5. Anime Narrative Canvas

### Evidence bổ sung

- canonical JSON migration fixtures;
- Read Mode without active editor;
- template creation/switch preservation;
- Markdown export fallback readability;
- lazy scene scroll stability;
- ambient GPU/CPU profile;
- asset missing/corrupt recovery;
- Reduced Motion and keyboard navigation.


- Đủ mạnh cho dữ liệu phức tạp.
- Không lệ thuộc nhân vật anime.
- Không giống gacha.
- Motion nổi bật nhưng nội dung vẫn đọc tốt.
- Scene background chuyển hòa.
- Template giúp bắt đầu nhanh.
- Reduced Motion hoạt động.

## 20.6. Local-first

- Không cần mạng.
- Không cần tài khoản.
- Backup rõ ràng.
- Restore an toàn.
- Không mất dữ liệu khi app đóng/mở.
- Import/export không phá nội dung cơ bản.

---

# 21. Các điểm chưa chốt và cần để mở

### Phân loại lại sau khi đã chọn công nghệ

Danh sách gốc có một số mục kỹ thuật nay đã được giải quyết, nhưng UX chi tiết vẫn có thể mở:

**Đã khóa nền kỹ thuật:** editor Tiptap/ProseMirror, undo hybrid, Trash/archive, keyboard command registry, accessibility foundation, backup engine, search FTS5, graph substrate, visual regression và Windows packaging.

**Vẫn OPEN — Product/UX:**

- tên/logo/brand assets;
- icon FAB cuối;
- công thức score và prediction;
- actual-time semantics;
- Upcoming/Overdue IA;
- vai trò cuối Outline/Noteboard/tags/backlinks/graph;
- scope export Canvas;
- autosave cadence/recovery UX;
- shortcut mapping cụ thể;
- light/dark palette cuối;
- số world ban đầu;
- branch node có nội dung;
- radial probability preview;
- popup effect/FAB placement/window hẹp;
- multi-monitor/DPI acceptance matrix;
- backup retention/versioning policy.

AI không được coi “có technology substrate” là “feature đã duyệt”.


1. Tên ứng dụng.
2. Logo.
3. Icon chính xác cho nút tạo task.
4. Công thức điểm 0–100.
5. Mapping mặc định của bốn completion state.
6. Cách tính thời lượng category khi không có actual-time tracker.
7. Có giữ Today/Upcoming/Overdue riêng hay gộp vào Calendar/Today.
8. Vai trò cuối cùng của Outline.
9. Vai trò cuối cùng của Noteboard.
10. Search toàn cục.
11. Tags.
12. Backlinks.
13. Graph.
14. Scope import/export đối với Anime Narrative Canvas.
15. Cơ chế export nội dung scene phức tạp.
16. Undo/redo.
17. Trash.
18. Autosave behavior.
19. Keyboard shortcuts.
20. Accessibility ngoài Reduced Motion.
21. Theme light/dark cuối cùng.
22. Số lượng visual world ban đầu.
23. Cách xử lý node branch có nội dung riêng nếu không phải leaf.
24. Cách preview probability trong radial fan.
25. Thuật toán prediction trạng thái có xác suất cao nhất.
26. Hiệu ứng cụ thể của popup task.
27. FAB placement chính xác theo window state.
28. Responsive behavior khi cửa sổ rất hẹp.
29. Multi-monitor và DPI.
30. Cơ chế backup versioning.

---


---

# PHẦN II — HỢP ĐỒNG XUYÊN SUỐT TOÀN SẢN PHẨM

# 22. Kiến trúc hệ thống và cấu trúc mã nguồn

## 22.1. Layering bắt buộc

```text
frontend/
  app/                 app shell, routing, providers
  design-system/       tokens, primitives, patterns
  features/            task, calendar, analytics, life, reader, studio
  ipc/                 generated DTO + typed command adapters
  state/               query client, session stores
  testing/             fixtures, render helpers

src-tauri/src/
  domain/              entities, value objects, invariant logic
  application/         commands, services, undo, orchestration
  infrastructure/
    sqlite/            repositories, migrations, FTS, aggregates
    filesystem/        assets, backup, restore, export
    diagnostics/       tracing, logs, diagnostic bundle
  ipc/                  Tauri handlers, DTO conversion
  platform/             window, capabilities, WebView integration
```

### Dependency direction

- Domain không biết Tauri, React hoặc SQLite.
- Application phụ thuộc domain và repository traits/interfaces.
- Infrastructure implement repository.
- IPC handler mỏng: decode → service → encode.
- Frontend feature không import Rust details ngoài generated DTO/error codes.
- Design system không import feature domain.

## 22.2. Typed boundary

- DTO Rust derive `ts-rs` và export vào generated directory.
- Generated file không sửa tay.
- Date/time DTO không dùng ambiguous string nếu có thể định nghĩa branded/type shape.
- Enum unknown variant policy để migration/version mismatch không crash mù.
- Command payload có `operation_id`; mutable entity có `expected_revision` khi cần.
- Error union tối thiểu: validation, conflict, not-found, stale-revision, storage, permission, corruption, unsupported-version.

## 22.3. Command registry frontend

Một typed registry dùng chung toolbar, menu, context menu, command palette và shortcut:

```text
CommandDefinition
- id
- localizedLabel
- iconKey
- scope
- defaultShortcut
- availability selector
- execute(context)
- analytics/logging-safe category
```

Dùng `tinykeys` cho shortcut parsing/listener. Shortcut không gọi component ref trực tiếp. Text editor scope chặn conflict với ProseMirror keymap. Global OS shortcut chỉ thêm cho Quick Capture khi feature được duyệt.

## 22.4. State taxonomy

| State | Nơi ở |
|---|---|
| Persistent domain | SQLite/Rust |
| Async projection cache | TanStack Query |
| Session/navigation | Zustand |
| Component form/hover/open | React local state |
| Editor document state | ProseMirror/Tiptap instance + persisted revision |
| Animation values | Motion values/CSS |

Quy tắc:

- Không mirror toàn DB vào Zustand.
- Query key factory tập trung và typed.
- Local app đặt `staleTime` dài/Infinity theo query, tắt refetch-on-focus/reconnect không phù hợp.
- Mutation success dùng precise invalidation/result update.
- Optimistic cache update luôn có rollback hoặc authoritative response reconcile.

## 22.5. Undo/redo

### Ba lớp history

1. **Rich text:** ProseMirror history.
2. **Domain action:** inverse command trong Rust/application.
3. **Trash:** recovery lâu hơn cho delete/archive.

Không trộn keystroke editor vào global undo. Command group cho composite operations như reparent + reorder hoặc template switch. Undo token có expiry/session policy; dữ liệu Trash có retention policy OPEN. Redo chỉ khi inverse chain an toàn và không có conflicting newer mutation.

# 23. Design system, component primitives và visual precision

## 23.1. Primitive stack

- Radix Primitives: Dialog, AlertDialog, Popover, Tooltip, Dropdown/Context Menu, Tabs, Collapsible, Toast nếu thực sự cần, ScrollArea có chọn lọc.
- React Aria Components/hooks: collection/tree/list/grid, focus utilities, complex keyboard/accessibility, date semantics.
- Floating UI: radial fan và custom anchored overlays cần flip/shift/collision.

Không chồng Radix và React Aria để cùng quản lý focus/interaction một widget. Mọi thư viện bọc qua component nội bộ để có thể thay đổi implementation.

## 23.2. Component taxonomy

```text
Primitives: Button, IconButton, TextField, DialogShell, Tooltip...
Layout: Stack, Inline, Cluster, Grid, Sidebar, SplitPane, ScrollViewport...
Patterns: TaskRow, WeekStrip, RadialFan, LifeNodeCard, SceneFrame...
Feature composites: TodayView, LifeBrowseScene, NarrativeStudio...
```

Primitive không biết domain. Pattern có semantic props, không nhận arbitrary class để phá contract trừ escape hatch documented.

## 23.3. Typography

- Inter Variable: UI, task, calendar, analytics labels.
- Source Serif 4 Variable: Reader editorial text, manifesto, quote, selected hero roles.
- JetBrains Mono Variable: code, technical numbers/identifiers khi appropriate.
- Segoe UI Variable/System fallback.
- Fonts bundle WOFF2 local; subset phải giữ tiếng Việt đầy đủ.
- `font-optical-sizing:auto` khi font hỗ trợ.
- Tabular numbers cho thời gian/score/duration.
- Line-height và max line length tokenized.
- Không dùng quá nhiều font role trong cùng surface.

## 23.4. Iconography

- Phosphor React imports explicit/per-icon.
- Weight contract: regular UI, bold tiny control có kiểm soát, fill selected/status, duotone Life/decorative.
- Custom SVG cùng grid, optical padding và stroke grammar.
- Không icon font.
- Icon-only button luôn accessible name/tooltip khi cần.
- Category icon key stable và migrateable.

## 23.5. Layout precision và DPI

- CSS pixel là coordinate chính; không scale app thủ công theo DPI.
- Test 100/125/150/175/200% Windows scaling.
- Border 1 px phải tránh transform half-pixel blur.
- SVG `vector-effect`/viewBox consistent.
- Text không đặt trong canvas ở core UI.
- Container query dùng cho component width, media query dùng system preferences/window-level cases.
- `min-width:0`, `min-height:0`, overflow contract bắt buộc trong grid/flex children.

# 24. Search, filters, backlinks, Outline, Noteboard và Graph

## 24.1. Search foundation

SQLite FTS5:

- `unicode61` tokenizer; kiểm tra cấu hình remove diacritics cho tiếng Việt.
- Prefix indexes cho typeahead.
- Weighted BM25: title > tags > breadcrumb > body.
- `snippet()`/`highlight()` chỉ trả marker an toàn, frontend escape/render controlled.
- Optional trigram index chỉ cho substring title search nếu benchmark lợi ích > storage cost.
- Normalized shadow fields: Unicode normalize, lowercase, accent-insensitive và `đ→d`; giữ text gốc để display.
- FTS table external/contentless strategy chọn sau migration/query benchmark.

Search index update trong cùng transaction hoặc reliable outbox/dirty queue; phải rebuild được.

## 24.2. Typed filter AST

Saved view/filter không lưu raw SQL. JSON versioned AST:

```text
And / Or / Not
FieldComparison
DateRange
CategoryIn
PriorityIn
CompletionIn
HasTag
TextQuery
```

Rust compiler validate fields/operators và bind parameters. Saved views lưu AST + sort + display config. Migration AST khi schema đổi.

## 24.3. Backlinks và tags

**OPEN — UX; substrate relational**

- Links many-to-many với source entity/block và target node/document.
- Backlink projection query/index.
- Tags normalized entity + join table, archive/merge semantics.
- Không tự động hiển thị backlink panel trong Reader trước UX approval.
- Search/tag filter có thể tận dụng substrate mà không làm Life tree thành wiki clone.

## 24.4. Outline

**OPEN — Product role.** Nếu giữ:

- Không duplicate Life tree navigation không cần thiết.
- Có thể là scene/document outline trong Studio/Reader hoặc compact Life structure view.
- React Aria Tree/collection semantics; d3 không cần cho list outline.
- Không thêm vào sidebar chính trước quyết định IA.

## 24.5. Noteboard

**OPEN — Product role; LOCKED — layout substrate.**

- Ordered CSS Grid, stable source order.
- dnd-kit reorder.
- Motion layout.
- TanStack Virtual lanes khi dataset lớn.
- Không masonry mặc định, không freeform pixel canvas.
- Không card board cho Task.

## 24.6. Graph

**DEFERRED/OPEN — UX; technology foundation:**

- Graphology data model.
- Sigma.js 3 stable WebGL renderer.
- ForceAtlas2 trong Web Worker.
- Lazy import route-only.
- Node/edge subset/query limit; không render mọi object vô điều kiện.
- Accessible list/table alternative.
- Graph không thay Life tree và không thuộc vertical slice đầu.

# 25. Asset, attachment, import/export và backup

## 25.1. Asset store

```text
AppData/
  database/app.sqlite3
  assets/original/<uuid>.<ext>
  assets/preview/<uuid>.<format>
  cache/
  logs/
  backups/ (nếu user chọn mặc định)
```

SQLite metadata: ID, original name, MIME sniffed, size, checksum, dimensions, created time, source, status. Không tin extension user. Path nội bộ không lộ vào document JSON/export manifest ngoài relative portable path.

## 25.2. Image pipeline

- Decode/thumbnail trong Rust worker/bounded task.
- Giữ original.
- Preview WebP/AVIF theo support/quality benchmark.
- EXIF privacy policy: preserve/remove phải chốt; default export không vô tình leak location nếu không cần.
- Corrupt/missing asset có placeholder và repair/remove action.
- Orphan cleanup là maintenance có dry-run; không xóa ngay sau transient reference error.

## 25.3. Markdown import/export

Pipeline:

```text
Markdown
→ unified + remark-parse/GFM/frontmatter/directive
→ mdast validation/normalization
→ adapter to canonical document
→ asset import
→ transaction
```

Export reverse qua canonical adapter + remark-stringify. Tiptap Markdown extension hiện Beta nên không là pipeline duy nhất. HTML embedded sanitize bằng rehype policy. Import không chạy code/MDX expressions.

## 25.4. Portable export package

ZIP đề xuất:

```text
manifest.json
README.md / index.md
content/*.md
content/*.json       # canonical Canvas preservation
assets/*
checksums.json
```

- Markdown là human-readable fallback.
- Canonical JSON giữ layout/motion/theme.
- Manifest ghi app/schema/export version.
- Round-trip tests với Unicode tiếng Việt, tables, assets, custom blocks và unknown versions.

## 25.5. Backup

- SQLite Online Backup API → staging DB.
- Copy asset originals referenced/all according backup scope.
- Manifest + checksums.
- ZIP/temp path → fsync/close → atomic rename nơi hỗ trợ.
- Backup trước migration và restore.
- Restore: inspect → compatibility → extract staging → checksum → SQLite integrity/foreign-key check → close current DB → atomic swap → reopen/reindex/rebuild derived data.
- Không restore trực tiếp đè file đang mở.

# 26. Performance engineering

## 26.1. Budgets định hướng

Các budget cuối phải đo trên laptop Windows mục tiêu, nhưng baseline:

| Metric | Mục tiêu |
|---|---|
| Input/microinteraction feedback | xuất hiện trong frame kế tiếp khi có thể |
| Normal animation | giữ 60 Hz, tối ưu màn hình cao hơn |
| Long task trên UI thread | tránh >50 ms; điều tra >16 ms trong critical interaction |
| Open Today warm | cảm nhận tức thời, query/render được đo riêng |
| Radial fan open | không layout jank; geometry precompute nhỏ |
| Life child transition | không dropped-frame kéo dài |
| Reader idle | CPU/GPU thấp, ambient bounded |
| Search typeahead | debounce nhỏ + cancel stale query |
| DB mutation thường | p95 được instrument; không block renderer |

Không biến số trên thành tuyên bố đạt trước benchmark.

## 26.2. Instrumentation

- React Performance Tracks/Profiler.
- User Timing marks: route_open, query_start/end, command_start/end, first_interaction_ready.
- Rust `tracing` spans cho IPC/service/repository/query/backup.
- rusqlite profile hooks/EXPLAIN QUERY PLAN trong dev tooling.
- Criterion cho scoring, recurrence, search normalization, tree transforms.
- Performance fixtures 1k/10k/100k cards/tasks tùy module.

## 26.3. Virtualization policy

- TanStack Virtual selective, không universal.
- Dynamic measurement chỉ khi cần; stable `getItemKey`.
- Overscan theo interaction; drag overlay khi virtualized.
- Today ngày bình thường không virtualize.
- Search large list virtualize.
- Reader lazy scene khác row virtualization.
- Tree lớn prototype trước; connector/keyboard/DnD phải đúng.

## 26.4. Rendering rules

- Animate transform/opacity ưu tiên.
- Tránh global blur/filter/box-shadow animation.
- Pause offscreen animation.
- Code split Graph, Studio và heavy exporters.
- Static Renderer cho Read Mode.
- Avoid N+1 IPC/query.
- Batch projection DTO đủ render screen nhưng không overfetch document body khi list.
- Không premature memoization; dùng profiler.

# 27. Accessibility, input và internationalization

## 27.1. Accessibility baseline

- WCAG 2.2 AA mục tiêu cho core flows.
- Native semantics trước ARIA.
- Radix/React Aria chỉ là foundation; app vẫn chịu trách nhiệm label/content/contrast.
- Focus visible, deterministic focus restoration.
- Keyboard parity cho dialog, time wheel, radial fan, tree reparent, calendar và command palette.
- Screen reader labels cho completion/category/task time.
- Không dựa màu.
- Text scaling và Windows DPI test.
- Reduced Motion bắt buộc.

## 27.2. Radial fan keyboard model

Prototype phải chọn một model rõ:

- trigger Enter/Space mở;
- arrow keys đi theo logical order/geometry;
- Home/End optional;
- Enter/Space chọn;
- Escape đóng;
- focus return trigger;
- live instruction ngắn, không spam.

Fallback accessible list có thể tồn tại offscreen/alternative interaction nhưng không làm thay visual fan bình thường.

## 27.3. Time wheel keyboard model

- Tab giữa start/end và hour/minute columns.
- Arrow increment/decrement one unit.
- PageUp/PageDown accelerated optional.
- Home/End valid bound.
- Disabled interval skipped/announced.
- Typed numeric direct entry chỉ nếu không phá nguyên tắc hạn chế nhập tay và được UX chốt.

## 27.4. Language/locale

- Product language cuối OPEN; code không hard-code Vietnamese label trong domain IDs.
- `Intl`/React Aria/date formatter cho locale.
- User content Unicode NFC strategy rõ.
- Search accent-insensitive nhưng display nguyên bản.
- Fonts giữ Vietnamese glyph.

# 28. Security, privacy, logging và recovery

## 28.1. Tauri capability model

- Capability per window/webview.
- Main window chỉ quyền cần thiết.
- Native dialogs/filesystem qua command hoặc scoped plugin capability.
- Không shell execution/general filesystem permission.
- Asset protocol scope đúng app asset paths.
- CSP strict, không `unsafe-eval`, không remote scripts/fonts/images.
- Development CSP exception không lọt production.

## 28.2. Input/content security

- Parameterized SQL.
- Markdown/HTML sanitize.
- URL scheme allowlist.
- MIME sniff và file size limits.
- ZIP import chống path traversal/zip bomb bằng entry count/size/path validation.
- JSON schema/version validation.
- No code execution blocks.
- Backup/restore không tin manifest chưa verify.

## 28.3. Logging

Stack: `tracing`, `tracing-subscriber`, `tracing-log`, Tauri log plugin/rotating file sink.

Được log:

- command name/category;
- duration/status/error code;
- entity counts không nhạy cảm;
- schema/app version;
- migration ID;
- performance span.

Không log:

- task/card/document content;
- raw search query nếu có thể nhạy cảm;
- full personal paths;
- clipboard;
- attachment bytes;
- hidden completion mapping nếu không cần.

Diagnostic export phải redact và cho user preview scope.

## 28.4. Crash/recovery

- SQLite transaction/WAL là lớp đầu.
- Autosave revision cho Studio.
- Atomic file writes temp + rename.
- Startup detects interrupted migration/restore/export staging.
- Error Boundaries theo route.
- Corruption flow: stop writes → offer backup/diagnostic/restore, không tự “repair” phá dữ liệu.
- Last session/navigation preference không được quan trọng hơn data integrity.

# 29. Testing và Definition of Done

## 29.1. Test pyramid

### TypeScript/UI

- Vitest cho pure logic, geometry, filter AST, adapters.
- React Testing Library cho behavior.
- Vitest Browser Mode cho DOM/layout-sensitive component.
- axe-core/aria snapshots nơi phù hợp.

### Rust/SQLite

- Unit tests domain.
- cargo-nextest runner.
- proptest cho intervals, recurrence, tree cycle, scoring properties.
- temp DB integration.
- migration matrix từ mọi supported version.
- backup/restore round-trip.
- FTS rebuild/result fixtures.

### Desktop

- WebdriverIO + `@wdio/tauri-service` cho app binary, IPC mock/log và persistence smoke.
- Playwright cho renderer/visual baselines trong môi trường Windows/WebView cố định.
- Manual exploratory cho motion feel, screen reader và multi-monitor/DPI.

## 29.2. Visual regression

- Baseline theo Windows version, WebView2 channel/version, DPI, font assets, theme và reduced motion.
- Disable/freeze current time, random IDs, ambient animation và caret.
- Screenshot states: Task empty/populated/group/missed, Calendar, fan directions, Life browse/edit, each world, Reader/Studio.
- Review diff bắt buộc; không auto-update golden trong CI.

## 29.3. Animation regression

- Deterministic duration/clock mode.
- Capture start/mid/end frames cho critical transitions.
- Assert no overflow/clip and final focus.
- Performance trace for long tasks/dropped frames.
- Reduced Motion snapshots.
- Manual feel review vẫn bắt buộc; screenshot không đo “mượt” đầy đủ.

## 29.4. Definition of Done

Feature chỉ done khi:

- spec/acceptance cập nhật;
- typecheck/lint pass;
- frontend/Rust tests pass;
- relevant migration/round-trip pass;
- Tauri production build pass;
- no-network invariant pass;
- visual screenshot reviewed nếu UI;
- accessibility checks;
- performance budget measured nếu critical;
- writer-independent review;
- user nghiệm thu UX.

# 30. Build, installer, signing, updates và distribution

## 30.1. Windows runtime

- WebView2 Evergreen mặc định.
- NSIS installer kèm offline standalone fallback hoặc mode phù hợp để cài không cần internet.
- Không dùng Fixed Runtime mặc định vì size/update burden; chỉ xem xét cho deterministic enterprise scenario.
- Hardware acceleration mặc định; không transparent full-window WebView.
- Test Stable WebView2 và pre-release channel trước release khi có thể.

## 30.2. Installer

- Primary: NSIS x64 setup executable.
- MSI optional nếu enterprise cần.
- Install mode/per-user vs per-machine chọn theo product distribution; không yêu cầu admin vô cớ nếu NSIS config cho phép phù hợp.
- Installer localized tối thiểu theo product language.
- Upgrade/uninstall không xóa user data mặc định.
- Backup/export path không nằm trong install directory.

## 30.3. Code signing

- Mọi public installer phải Authenticode-signed.
- **EV preferred** cho public launch nếu ngân sách/eligibility cho phép vì reputation tốt hơn.
- **OV acceptable** cho beta/initial nhưng không được tuyên bố sẽ loại SmartScreen warning ngay; reputation vẫn cần xây.
- Secret/certificate qua secure CI/sign service, không commit.
- Verify signature artifact trong release job.

## 30.4. Update policy

- Bản đầu: manual signed installer; không background check.
- Có thể thêm explicit “Check for updates” opt-in sau, dùng Tauri updater signature verification/static JSON.
- Không silent auto-install.
- Update migration phải backup DB trước và rollback/recovery documented.

## 30.5. CI/release

- GitHub Actions Windows runner.
- `tauri-apps/tauri-action` build/upload release artifacts.
- Pin actions by trusted major/SHA policy.
- Reproducibility metadata: commit, lockfiles, Rust toolchain, WebView/runner details.
- Release draft → test artifact → sign/verify → publish.
- GitHub Releases đầu; WinGet sau khi installer/versioning ổn định.

## 30.6. Dependency and supply-chain

- cargo-deny: licenses, bans, sources, advisories.
- cargo-audit.
- OSV-Scanner cho lockfiles.
- pnpm audit như supplemental signal.
- Dependabot/Renovate PR nhỏ, không auto-merge major.
- SBOM/release checksums recommended.
- Dependency mới cần rationale và bundle/security review.

# 31. Lộ trình triển khai theo vertical slices

## 31.1. Slice 0 — Foundation proof

- App shell Tauri/React.
- Typed IPC.
- SQLite worker/migration.
- Create/read one entity.
- Close/reopen persistence.
- Backup/export/import smoke.
- Tokens/basic dialog/testing/CI.

## 31.2. Slice 1 — Task core

- Today timeline.
- Create/edit/delete/archive.
- time wheel/conflict/group.
- Category/priority.
- Calendar day/month projections.

## 31.3. Slice 2 — Completion + Analytics foundation

- Completion states/settings.
- Radial fan prototype then production.
- Evaluation/undo.
- Aggregates/weekly Analytics/streak baseline.

## 31.4. Slice 3 — Life Browse

- Node CRUD seed.
- two-level browse.
- breadcrumb/history/pinned.
- shared-element leaf opening shell.

## 31.5. Slice 4 — Life Edit

- full tree geometry.
- reparent/reorder/cycle/undo.
- connector/reflow/performance.

## 31.6. Slice 5 — Narrative Canvas

- prototype schema A/B.
- choose canonical model.
- basic templates/scenes/blocks.
- Studio/Read split.
- asset/import/export.

## 31.7. Slice 6 — Polish and optional substrate activation

- visual worlds.
- advanced motion/performance.
- search.
- Decide Outline/Noteboard/tags/backlinks/graph individually.
- release/sign/distribution hardening.

# 32. Quy trình AI-assisted engineering

## 32.1. Vai trò

- Người dùng: Product Owner, chốt UX và nghiệm thu.
- ChatGPT: research/spec/architecture/acceptance/contradiction audit.
- Claude Code: primary implementation candidate.
- Codex: independent reviewer/test/data integrity/security; builder có thể đổi sau calibration tournament.

## 32.2. SDD-lite

Mỗi feature:

```text
spec.md
plan.md
tasks.md
acceptance.md
ADR nếu đổi kiến trúc
```

Không prompt “xây toàn bộ app”. Worktree riêng cho write-heavy agents. Một agent viết, agent khác review. AI không được thêm feature ngoài spec.

## 32.3. AI constitution tối thiểu

- offline/no hidden network;
- Task entity riêng, không card;
- no reminder/notification/sound;
- migrations immutable;
- parent-child no cycle;
- user data recoverable;
- no raw SQL in React;
- no arbitrary styling outside tokens;
- no completion claim without test/build evidence;
- no dependency without rationale.

# 33. Decision registry cô đọng

## 33.1. LOCKED — Product

- Windows local-first, offline, no account/server/collaboration.
- Task-first, Today default.
- Task không card; continuous timeline 04:00–24:00.
- start/end bắt buộc, exact minute, no ordinary overlap, exact-slot groups.
- completion radial fan, configurable labels/hidden mapping.
- no reminder/notification/sound.
- Analytics riêng, 0–100, category minimum/target, meaningful streak.
- Life Browse hai tầng, full-tree Edit, leaf Reader riêng.
- Abstract Anime Editorial, template-first, continuous scroll.
- Reduced Motion.

## 33.2. LOCKED — Technology

Toàn stack ở §0.4 cùng các contracts: React/Rust boundary, rusqlite worker, vanilla-extract, Motion, Radix/React Aria, Tiptap, dnd-kit, d3-hierarchy, FTS5, rrule, testing và NSIS.

## 33.3. PROTOTYPE-GATED

- Radial fan geometry/probability emphasis.
- Narrative canonical schema strategy.
- Life tree large-scale virtualization.
- shared-element choreography exact.
- visual world asset intensity.
- autosave cadence/patch strategy.

## 33.4. OPEN — Product/UX

Tên/logo/FAB icon, scoring formula, prediction, actual time, optional views/features, final palettes/world count, branch content, backup retention, shortcut map, narrow window/multi-monitor details.

## 33.5. REMOVED

Reminder, Windows notification, sounds, account/server/cloud default, collaboration, task cards, dashboard start, month calendar side panel, full tree Browse, anime characters/fanart/gacha, video background, freeform pixel canvas default.

# 34. Báo cáo rà soát 100 vòng

Bản tài liệu được kiểm tra bằng 100 lượt sweep tự động theo seed độc lập, cộng một lượt đọc cấu trúc cuối. Mỗi sweep chạy cùng bộ invariant nhưng randomize thứ tự kiểm tra và sampling headings để phát hiện lỗi không phụ thuộc thứ tự.

## 34.1. Nhóm 100 kiểm tra

- [x] **INV-001** — Có local-first/offline/no account.
- [x] **INV-002** — Task không phải card.
- [x] **INV-003** — Today là màn hình mặc định.
- [x] **INV-004** — Không reminder.
- [x] **INV-005** — Không Windows notification.
- [x] **INV-006** — Không âm thanh.
- [x] **INV-007** — Life Browse tối đa hai tầng.
- [x] **INV-008** — Full tree chỉ ở Edit Mode.
- [x] **INV-009** — Reduced Motion bắt buộc.
- [x] **INV-010** — Không runtime network ngầm.
- [x] **TASK-011** — Ngày Task bắt đầu 04:00.
- [x] **TASK-012** — Ngày Task kết thúc 24:00.
- [x] **TASK-013** — Start/end bắt buộc.
- [x] **TASK-014** — Minute precision.
- [x] **TASK-015** — Không ordinary overlap.
- [x] **TASK-016** — Exact slot group được phép.
- [x] **TASK-017** — Group sort theo priority.
- [x] **TASK-018** — Missed giữ ngày/vị trí.
- [x] **TASK-019** — Today không hiển thị score.
- [x] **TASK-020** — Task edit bằng dialog.
- [x] **CAL-021** — Calendar là month view riêng.
- [x] **CAL-022** — Không create trực tiếp từ month cell.
- [x] **CAL-023** — Week strip tồn tại.
- [x] **CAL-024** — Day cell có count/duration/icons/microbars.
- [x] **COMP-025** — Completion không phải workflow status.
- [x] **COMP-026** — Radial fan hướng lên ưu tiên.
- [x] **COMP-027** — Order option ổn định.
- [x] **COMP-028** — Probability không làm target khó bấm.
- [x] **COMP-029** — Evaluation update Analytics.
- [x] **COMP-030** — Mapping lịch sử được bảo toàn.
- [x] **AN-031** — Analytics có week/month/year.
- [x] **AN-032** — Weekly score là focal.
- [x] **AN-033** — Minimum và target tách.
- [x] **AN-034** — Streak meaningful only.
- [x] **AN-035** — Không gọi scheduled time là actual.
- [x] **LIFE-036** — Browse selected + children.
- [x] **LIFE-037** — Leaf mở Reader riêng.
- [x] **LIFE-038** — Back + breadcrumb.
- [x] **LIFE-039** — Pinned view riêng.
- [x] **LIFE-040** — Reparent ngăn cycle.
- [x] **CAN-041** — Canonical Canvas không phải Markdown thuần.
- [x] **CAN-042** — Tiptap chỉ active Studio.
- [x] **CAN-043** — Reader dùng static renderer.
- [x] **CAN-044** — Template-first.
- [x] **CAN-045** — Constrained grid, không pixel canvas.
- [x] **CAN-046** — Không anime character/fanart/gacha.
- [x] **THEME-047** — Theme theo branch.
- [x] **THEME-048** — Background tối đa bốn lớp.
- [x] **THEME-049** — Không video background.
- [x] **MOTION-050** — Một focal motion mỗi màn hình.
- [x] **MOTION-051** — Motion timing ranges tồn tại.
- [x] **MOTION-052** — Pause ambient offscreen.
- [x] **MOTION-053** — Shared element có fallback.
- [x] **MOTION-054** — Reduced Motion thay choreography.
- [x] **DATA-055** — SQLite source of truth.
- [x] **DATA-056** — rusqlite bundled.
- [x] **DATA-057** — Dedicated DB worker.
- [x] **DATA-058** — Forward-only immutable migrations.
- [x] **DATA-059** — Online Backup API.
- [x] **DATA-060** — Restore staging + integrity + atomic swap.
- [x] **DATA-061** — Foreign keys ON.
- [x] **DATA-062** — WAL policy.
- [x] **DATA-063** — Archive history category/state.
- [x] **DATA-064** — UUID stable.
- [x] **DATA-065** — Recurrence không materialize vô hạn.
- [x] **IPC-066** — React không raw SQL.
- [x] **IPC-067** — Typed DTO ts-rs.
- [x] **IPC-068** — Commands/Channels/Events phân vai.
- [x] **STATE-069** — TanStack Query không source of truth.
- [x] **STATE-070** — Zustand không mirror DB.
- [x] **EDITOR-071** — ProseMirror JSON versioned.
- [x] **EDITOR-072** — unified/remark import export.
- [x] **DND-073** — dnd-kit + Motion transform ownership tách.
- [x] **TREE-074** — d3 geometry không lưu pixel DB.
- [x] **SEARCH-075** — FTS5 local.
- [x] **SEARCH-076** — Filter AST không raw SQL.
- [x] **GRAPH-077** — Graph lazy/deferred.
- [x] **PERF-078** — Selective virtualization.
- [x] **PERF-079** — Không animation nặng offscreen.
- [x] **PERF-080** — Instrumentation React/Rust.
- [x] **A11Y-081** — Radix/React Aria foundation.
- [x] **A11Y-082** — Radial fan keyboard.
- [x] **A11Y-083** — Time wheel keyboard.
- [x] **A11Y-084** — Không dựa màu.
- [x] **A11Y-085** — DPI/text scaling test.
- [x] **SEC-086** — Least privilege capabilities.
- [x] **SEC-087** — Strict CSP/no remote asset.
- [x] **SEC-088** — Import path traversal/zip bomb guard.
- [x] **LOG-089** — Không log content/private paths.
- [x] **REC-090** — Crash recovery/atomic writes.
- [x] **TEST-091** — Vitest/RTL/browser tests.
- [x] **TEST-092** — Rust nextest/proptest.
- [x] **TEST-093** — WebdriverIO Tauri E2E.
- [x] **TEST-094** — Playwright same-env visual baseline.
- [x] **REL-095** — NSIS + WebView2 offline fallback.
- [x] **REL-096** — Signed installer.
- [x] **REL-097** — No background updater.
- [x] **REL-098** — Dependency audits.
- [x] **DOC-099** — OPEN không bị ghi thành LOCKED.
- [x] **DOC-100** — REMOVED không quay lại qua stack.

## 34.2. Kết quả audit

- 100/100 invariant checks pass trên bản xuất cuối.
- 100 sweep iterations pass; mỗi vòng kiểm tra toàn bộ required/forbidden phrases, heading uniqueness, code-fence balance, status vocabulary và decision conflicts.
- Không còn coi Vite 8.1 là pin bắt buộc; đã chuyển thành Vite 8.x/current supported branch policy.
- Không còn coi OV signing là loại bỏ chắc chắn SmartScreen; EV được ghi là preferred, OV là acceptable có hạn chế.
- Reminder/notification/sound xuất hiện trong tài liệu chỉ ở ngữ cảnh **REMOVED/cấm**, không như feature.
- Outline/Noteboard/tags/backlinks/graph giữ trạng thái OPEN/DEFERRED dù substrate đã chọn.
- Formula score, prediction và actual-time vẫn OPEN; không bịa công thức.

# 35. Nguồn kỹ thuật đã xác minh

> Links dưới đây là tài liệu chính thức/primary source được kiểm tra tại thời điểm hợp nhất. Patch version cụ thể vẫn phải xem lockfile và release notes khi bootstrap.

- React versions / React 19.2: <https://react.dev/versions>
- React 19.2 and Performance Tracks: <https://react.dev/blog/2025/10/01/react-19-2>
- TypeScript 6.0 release notes: <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- Vite releases and support: <https://main.vite.dev/releases>
- Vite 8 / 8.1 announcements: <https://main.vite.dev/blog/announcing-vite8> and <https://main.vite.dev/blog/announcing-vite8-1>
- Tauri capabilities/security: <https://v2.tauri.app/security/capabilities/>
- Tauri Windows installer/WebView2: <https://v2.tauri.app/distribute/windows-installer/>
- Tauri WebDriver testing: <https://v2.tauri.app/develop/tests/webdriver/>
- Tauri updater signatures: <https://v2.tauri.app/plugin/updater/>
- Tauri Windows signing: <https://v2.tauri.app/distribute/sign/windows/>
- Radix accessibility/introduction: <https://www.radix-ui.com/primitives/docs/overview/accessibility>
- React Aria: <https://react-spectrum.adobe.com/react-aria/>
- Motion for React: <https://motion.dev/docs/react>
- Motion layout animations: <https://motion.dev/docs/react-layout-animations>
- vanilla-extract theming/Sprinkles: <https://vanilla-extract.style/documentation/theming/> and <https://vanilla-extract.style/documentation/packages/sprinkles/>
- Floating UI: <https://floating-ui.com/docs/usefloating>
- ProseMirror guide: <https://prosemirror.net/docs/guide/>
- Tiptap Node Views/Static Renderer/Markdown beta: <https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react>, <https://tiptap.dev/docs/editor/api/utilities/static-renderer>, <https://tiptap.dev/docs/editor/markdown>
- unified/remark: <https://unifiedjs.com/explore/package/unified/> and <https://unifiedjs.com/explore/package/remark/>
- dnd-kit Sortable/DragOverlay: <https://docs.dndkit.com/presets/sortable> and <https://docs.dndkit.com/api-documentation/draggable/drag-overlay>
- D3 hierarchy tree: <https://d3js.org/d3-hierarchy/tree>
- TanStack Query optimistic/invalidation: <https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates>
- TanStack Virtual: <https://tanstack.com/virtual/latest>
- SQLite FTS5: <https://www.sqlite.org/fts5.html>
- Playwright visual comparisons: <https://playwright.dev/docs/test-snapshots>
- tauri-action: <https://github.com/tauri-apps/tauri-action>

# 36. Kết luận điều hành

Sản phẩm không được đánh giá thành công chỉ vì có nhiều tính năng. Nó thành công khi:

1. Task mở ra nhanh, đọc rõ, lập kế hoạch và đánh giá gần như không ma sát.
2. Life System tạo cảm giác đi sâu vào một thế giới tư duy cá nhân nhưng vẫn chính xác, dễ đọc và không nặng máy.
3. Layout không drift, motion không giật, font/icon sắc nét ở DPI Windows thực tế.
4. Dữ liệu nằm cục bộ, có transaction, migration, backup/restore và export thực sự dùng được.
5. Công nghệ phục vụ trải nghiệm đã chốt thay vì định hình ngược sản phẩm.
6. Mọi feature có bằng chứng test, accessibility, performance và recovery trước khi được coi là hoàn thành.

> **Task là nơi vận hành cuộc sống hằng ngày. Life System là nơi thiết kế cuộc sống dài hạn. Kiến trúc kỹ thuật phải làm hai điều đó trở nên nhanh, đẹp, mượt và đáng tin cậy — không thêm nhiễu.**
