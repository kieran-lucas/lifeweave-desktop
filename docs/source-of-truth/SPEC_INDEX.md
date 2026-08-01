# Full specification heading index

Generated from the immutable source. **402 headings**, 4637 lines.

| Level | Line range | Heading |
|---:|---:|---|
| 1 | 1–11 | SIÊU ĐẶC TẢ TÍCH HỢP SẢN PHẨM – GIAO DIỆN – CÔNG NGHỆ |
| 2 | 2–11 | Ứng dụng desktop Windows local-first: Task System + Life System |
| 1 | 12–115 | 0. Quản trị tài liệu và phương pháp ra quyết định |
| 2 | 15–28 | Quy ước trạng thái quyết định |
| 2 | 29–41 | 0.1. Mười lượt trace độc lập đã thực hiện |
| 2 | 42–61 | 0.2. Mô phỏng quyết định 10 × 1.000.000 vòng |
| 2 | 62–71 | 0.3. Chính sách phiên bản |
| 2 | 72–102 | 0.4. Stack chuẩn hợp nhất |
| 2 | 103–115 | 0.5. Nguyên tắc chống “implementation lấn át sản phẩm” |
| 1 | 116–119 | PHẦN I — ĐẶC TẢ TÍCH HỢP THEO KHU VỰC SẢN PHẨM |
| 1 | 120–197 | 1. Tầm nhìn sản phẩm |
| 3 | 122–158 | Hợp đồng kiến trúc đi kèm tầm nhìn |
| 2 | 159–167 | 1.1. Định nghĩa ngắn gọn |
| 2 | 168–188 | 1.2. Định hướng trải nghiệm |
| 3 | 170–188 | Ma trận trải nghiệm → quyết định kỹ thuật |
| 2 | 189–197 | 1.3. Tần suất sử dụng |
| 1 | 198–368 | 2. Phạm vi và nguyên tắc bất biến |
| 3 | 200–213 | Enforcement ở cấp repo |
| 2 | 214–271 | 2.1. Nền tảng |
| 3 | 216–228 | Nền tảng kỹ thuật đã khóa sau xác minh |
| 3 | 229–249 | Ranh giới React – Rust |
| 3 | 250–271 | IPC contract |
| 2 | 272–304 | 2.2. Nguyên tắc local-first |
| 3 | 274–286 | Local-first ở mức runtime |
| 3 | 287–304 | Nguyên tắc durability |
| 2 | 305–345 | 2.3. Nguyên tắc thiết kế |
| 3 | 307–318 | Design system enforcement |
| 3 | 319–345 | Các scale tối thiểu |
| 2 | 346–368 | 2.4. Phạm vi của giai đoạn hiện tại |
| 1 | 369–449 | 3. Hai trục sản phẩm cốt lõi |
| 3 | 371–393 | Domain separation |
| 2 | 394–407 | 3.1. Task System |
| 2 | 408–435 | 3.2. Life System |
| 2 | 436–449 | 3.3. Quan hệ giữa hai trục |
| 1 | 450–571 | 4. Kiến trúc thông tin và điều hướng toàn ứng dụng |
| 3 | 452–462 | App shell implementation contract |
| 3 | 463–478 | Layer contract |
| 2 | 479–512 | 4.1. Bố cục app shell |
| 3 | 481–490 | Kích thước và responsiveness |
| 3 | 491–512 | Scroll ownership |
| 2 | 513–519 | 4.2. Màn hình mặc định |
| 2 | 520–546 | 4.3. Sidebar |
| 3 | 522–530 | Component và trạng thái |
| 3 | 531–546 | Acceptance |
| 2 | 547–562 | 4.4. Life System nhớ vị trí |
| 3 | 549–562 | Persistence contract |
| 2 | 563–571 | 4.5. Điều hướng Today và Calendar |
| 1 | 572–1149 | 5. Hệ thống Task |
| 3 | 574–599 | Kiến trúc feature Task |
| 3 | 600–612 | Data flow một mutation |
| 2 | 613–630 | 5.1. Task không phải card |
| 3 | 615–630 | DOM và visual contract |
| 2 | 631–656 | 5.2. Cấu trúc ngày |
| 3 | 633–656 | Time domain contract |
| 2 | 657–676 | 5.3. Timeline liên tục |
| 3 | 659–676 | Layout implementation |
| 2 | 677–761 | 5.4. Bố cục một hàng task |
| 3 | 679–696 | Grid contract của TaskRow |
| 3 | 697–712 | Render performance |
| 3 | 713–727 | Cột trái — thời gian |
| 4 | 715–727 | Typography và accessibility |
| 3 | 728–745 | Cột giữa — nội dung |
| 4 | 730–745 | Content rendering |
| 3 | 746–761 | Cột phải — đánh giá |
| 4 | 748–761 | Assessment control |
| 2 | 762–769 | 5.5. Đường phân cách |
| 2 | 770–793 | 5.6. Single-click và double-click |
| 3 | 772–780 | Interaction implementation |
| 3 | 781–788 | Single-click |
| 3 | 789–793 | Double-click |
| 2 | 794–826 | 5.7. Tạo task |
| 3 | 796–826 | FAB và create command |
| 2 | 827–862 | 5.8. Popup tạo/chỉnh task |
| 3 | 829–838 | Dialog technology |
| 3 | 839–862 | Autosave policy |
| 2 | 863–871 | 5.9. Hạn chế nhập tay |
| 2 | 872–896 | 5.10. Bộ chọn giờ |
| 3 | 874–883 | TimeWheel architecture |
| 3 | 884–896 | Minute precision |
| 2 | 897–918 | 5.11. Quy tắc khoảng thời gian hợp lệ |
| 3 | 899–918 | Conflict engine |
| 2 | 919–958 | 5.12. Group task cùng khung giờ |
| 3 | 921–958 | Data và layout |
| 2 | 959–989 | 5.13. Priority |
| 3 | 961–989 | Visual token |
| 2 | 990–1033 | 5.14. Category |
| 3 | 992–1033 | Category architecture |
| 2 | 1034–1071 | 5.15. Recurring |
| 3 | 1036–1045 | Recurrence engine |
| 3 | 1046–1051 | Ba phạm vi sửa |
| 3 | 1052–1071 | Test bắt buộc |
| 2 | 1072–1092 | 5.16. Reminder |
| 3 | 1074–1092 | Enforcement trạng thái REMOVED |
| 2 | 1093–1112 | 5.17. Task bỏ lỡ |
| 3 | 1095–1112 | Missed state derivation |
| 2 | 1113–1139 | 5.18. Đường thời gian hiện tại |
| 3 | 1115–1139 | CurrentTimeIndicator |
| 2 | 1140–1149 | 5.19. Không hiển thị điểm trên Task |
| 1 | 1150–1281 | 6. Lịch tháng và điều hướng ngày |
| 3 | 1152–1164 | Calendar architecture |
| 2 | 1165–1191 | 6.1. Today week strip |
| 3 | 1167–1191 | WeekStrip component |
| 2 | 1192–1210 | 6.2. Calendar view |
| 3 | 1194–1210 | Month view layout |
| 2 | 1211–1271 | 6.3. Nội dung ô ngày |
| 3 | 1213–1271 | Data projection và rendering |
| 2 | 1272–1281 | 6.4. Trạng thái ngày |
| 1 | 1282–1507 | 7. Đánh giá mức độ hoàn thành task |
| 3 | 1284–1292 | Completion subsystem architecture |
| 2 | 1293–1310 | 7.1. Bản chất |
| 2 | 1311–1340 | 7.2. Bộ trạng thái mặc định |
| 3 | 1313–1340 | Default seed và customization |
| 2 | 1341–1358 | 7.3. Ánh xạ ngầm |
| 3 | 1343–1358 | Scoring data contract |
| 2 | 1359–1379 | 7.4. Vòng tròn đóng |
| 3 | 1361–1379 | Trigger rendering |
| 2 | 1380–1416 | 7.5. Bộ chọn hình quạt |
| 3 | 1382–1393 | RadialFan technology |
| 3 | 1394–1416 | Geometry contract |
| 2 | 1417–1463 | 7.6. Xác suất dự đoán |
| 3 | 1419–1463 | Prediction scope |
| 2 | 1464–1487 | 7.7. Sau khi chọn |
| 3 | 1466–1487 | Transaction sequence |
| 2 | 1488–1507 | 7.8. Phân biệt trạng thái vận hành và đánh giá |
| 3 | 1492–1498 | Trạng thái vận hành |
| 3 | 1499–1507 | Đánh giá kết quả |
| 1 | 1508–1766 | 8. Analytics, điểm số, thời lượng và streak |
| 3 | 1510–1518 | Analytics architecture |
| 3 | 1519–1533 | Aggregate strategy |
| 2 | 1534–1547 | 8.1. Analytics là trang riêng |
| 2 | 1548–1566 | 8.2. Thứ tự ưu tiên trang tuần |
| 3 | 1550–1566 | Layout contract |
| 2 | 1567–1587 | 8.3. Điểm tổng hợp |
| 3 | 1569–1587 | Score contract |
| 2 | 1588–1615 | 8.4. Màu điểm |
| 3 | 1590–1615 | Color implementation |
| 2 | 1616–1663 | 8.5. Thuật toán điểm |
| 3 | 1618–1663 | Engineering contract cho thuật toán chưa chốt |
| 2 | 1664–1710 | 8.6. Thống kê thời gian theo category |
| 3 | 1666–1710 | Duration semantics |
| 2 | 1711–1746 | 8.7. Streak |
| 3 | 1713–1746 | Streak engine |
| 2 | 1747–1766 | 8.8. Tổng kết theo thời gian |
| 1 | 1767–1940 | 9. Life System dạng cây card |
| 3 | 1769–1779 | Life Browse architecture |
| 3 | 1780–1784 | Performance |
| 2 | 1785–1798 | 9.1. Mục đích |
| 2 | 1799–1825 | 9.2. Browse Mode chỉ hiện hai tầng |
| 3 | 1801–1825 | Layout contract |
| 2 | 1826–1856 | 9.3. Chuyển xuống node con |
| 3 | 1828–1856 | Transition choreography |
| 2 | 1857–1879 | 9.4. Card trung gian |
| 3 | 1859–1879 | Card component |
| 2 | 1880–1900 | 9.5. Leaf card |
| 3 | 1882–1900 | Reader opening |
| 2 | 1901–1920 | 9.6. Back và breadcrumb |
| 2 | 1921–1940 | 9.7. Pinned |
| 3 | 1923–1940 | Pinned projection |
| 1 | 1941–2070 | 10. Life System Edit Mode |
| 3 | 1943–1957 | Full-tree editor architecture |
| 2 | 1958–1964 | 10.1. Chế độ riêng |
| 2 | 1965–1994 | 10.2. Hiển thị toàn bộ cây |
| 3 | 1967–1994 | Geometry pipeline |
| 2 | 1995–2025 | 10.3. Chỉnh cấu trúc |
| 3 | 1997–2025 | Command catalog |
| 2 | 2026–2056 | 10.4. Drag reparent |
| 3 | 2028–2038 | DnD interaction contract |
| 3 | 2039–2056 | Cycle validation |
| 2 | 2057–2070 | 10.5. Mức độ thu nhỏ |
| 1 | 2071–2518 | 11. Anime Narrative Canvas |
| 3 | 2073–2084 | Canonical content architecture |
| 3 | 2085–2089 | Vì sao JSON canonical |
| 2 | 2090–2123 | 11.1. Định nghĩa |
| 3 | 2092–2123 | Document boundaries |
| 2 | 2124–2151 | 11.2. Định hướng thị giác |
| 2 | 2152–2188 | 11.3. Cấu trúc scene |
| 3 | 2154–2188 | Scene runtime contract |
| 2 | 2189–2217 | 11.4. Preset bố cục scene |
| 3 | 2191–2217 | Layout engine |
| 2 | 2218–2306 | 11.5. Loại block |
| 3 | 2220–2239 | Block registry |
| 3 | 2240–2260 | Nội dung cơ bản |
| 4 | 2242–2260 | Implementation notes |
| 3 | 2261–2281 | Dữ liệu có cấu trúc |
| 4 | 2263–2281 | Structured blocks |
| 3 | 2282–2306 | Hình ảnh và trang trí |
| 4 | 2284–2306 | Asset/render policy |
| 2 | 2307–2314 | 11.6. Không liên kết trực quan giữa leaf card |
| 2 | 2315–2337 | 11.7. Read Mode |
| 3 | 2317–2337 | Read renderer và lazy scene |
| 2 | 2338–2373 | 11.8. Studio Mode |
| 3 | 2340–2373 | Studio shell |
| 2 | 2374–2394 | 11.9. Template-first |
| 3 | 2376–2394 | Template system |
| 2 | 2395–2518 | 11.10. Bảy template cốt lõi |
| 3 | 2397–2415 | 1. Domain Profile — Hồ sơ lĩnh vực |
| 3 | 2416–2433 | 2. Roadmap — Lộ trình |
| 3 | 2434–2449 | 3. Principles — Hệ nguyên tắc |
| 3 | 2450–2466 | 4. Strategy Dashboard — Bảng chiến lược |
| 3 | 2467–2482 | 5. Decision Studio — Ra quyết định |
| 3 | 2483–2500 | 6. Knowledge Dossier — Hồ sơ kiến thức |
| 3 | 2501–2518 | 7. Personal Vision — Tầm nhìn cá nhân |
| 1 | 2519–2699 | 12. Hệ thống theme Abstract Anime Editorial |
| 3 | 2521–2532 | Theme engine |
| 3 | 2533–2545 | Token hierarchy |
| 2 | 2546–2569 | 12.1. Theme theo branch |
| 3 | 2548–2569 | Inheritance |
| 2 | 2570–2643 | 12.2. Visual world mặc định |
| 3 | 2572–2587 | Asset và performance contract cho visual worlds |
| 3 | 2588–2593 | Life root — Celestial Nexus |
| 3 | 2594–2603 | Học tập — Azure Observatory |
| 3 | 2604–2613 | Sự nghiệp/Lab — Midnight Research Grid |
| 3 | 2614–2623 | Tài chính — Amber Vault |
| 3 | 2624–2633 | Sức khỏe — Verdant Pulse |
| 3 | 2634–2643 | Quan hệ/Tình yêu — Rose Nebula |
| 2 | 2644–2660 | 12.3. Branch mới |
| 3 | 2646–2660 | World library |
| 2 | 2661–2699 | 12.4. Background liên tục |
| 3 | 2663–2699 | Layer implementation |
| 1 | 2700–2877 | 13. Motion, chuyển cảnh và phản hồi giao diện |
| 3 | 2702–2712 | Motion system architecture |
| 3 | 2713–2717 | Motion ownership |
| 2 | 2718–2744 | 13.1. Mức motion |
| 3 | 2720–2744 | Mapping Calm / Expressive / Cinematic |
| 2 | 2745–2766 | 13.2. Page transition |
| 3 | 2747–2766 | Shared-element constraints |
| 2 | 2767–2797 | 13.3. Scene reveal |
| 3 | 2769–2797 | Reveal policy |
| 2 | 2798–2822 | 13.4. Ambient motion |
| 3 | 2800–2822 | Runtime budget |
| 2 | 2823–2846 | 13.5. Timing |
| 3 | 2825–2846 | Motion tokens |
| 2 | 2847–2865 | 13.6. Reduced Motion |
| 3 | 2849–2865 | Accessibility implementation |
| 2 | 2866–2877 | 13.7. Âm thanh |
| 1 | 2878–2993 | 14. Settings |
| 3 | 2880–2890 | Settings architecture |
| 2 | 2891–2912 | 14.1. Category Settings |
| 3 | 2893–2912 | UI và command |
| 2 | 2913–2932 | 14.2. Completion State Settings |
| 3 | 2915–2932 | Radial configuration preview |
| 2 | 2933–2943 | 14.3. Scoring Settings |
| 2 | 2944–2964 | 14.4. Appearance |
| 3 | 2946–2964 | Appearance storage |
| 2 | 2965–2972 | 14.5. Life System |
| 2 | 2973–2993 | 14.6. Backup |
| 3 | 2975–2993 | Backup UI integration |
| 1 | 2994–3224 | 15. Mô hình dữ liệu khái niệm |
| 3 | 2996–3011 | Data architecture tổng thể |
| 3 | 3012–3023 | Connection policy |
| 2 | 3024–3067 | 15.1. Task |
| 3 | 3026–3067 | Task relational contract dự kiến |
| 2 | 3068–3087 | 15.2. Category |
| 3 | 3070–3087 | Category storage |
| 2 | 3088–3109 | 15.3. Completion State |
| 3 | 3090–3109 | Completion schema |
| 2 | 3110–3131 | 15.4. Recurrence Rule |
| 3 | 3112–3131 | Recurrence tables |
| 2 | 3132–3158 | 15.5. Life Node |
| 3 | 3134–3158 | Tree storage |
| 2 | 3159–3179 | 15.6. Reader Document |
| 3 | 3161–3179 | Document persistence |
| 2 | 3180–3198 | 15.7. Scene |
| 3 | 3182–3198 | Scene/block storage options |
| 2 | 3199–3224 | 15.8. Analytics Aggregate |
| 3 | 3201–3224 | Aggregate tables |
| 1 | 3225–3342 | 16. Các hành vi biên và quy tắc nhất quán |
| 3 | 3227–3239 | Command/transaction/undo framework |
| 2 | 3240–3246 | 16.1. Task cùng khung giờ |
| 2 | 3247–3253 | 16.2. Xung đột giờ |
| 2 | 3254–3261 | 16.3. Task recurring bị chỉnh |
| 2 | 3262–3269 | 16.4. Task chưa đánh giá khi hết ngày |
| 2 | 3270–3283 | 16.5. Trạng thái completion bị xóa trong Settings |
| 3 | 3272–3283 | Enforcement |
| 2 | 3284–3295 | 16.6. Category bị xóa |
| 3 | 3286–3295 | Enforcement |
| 2 | 3296–3315 | 16.7. Đổi parent Life Node |
| 3 | 3298–3315 | Reparent transaction |
| 2 | 3316–3321 | 16.8. Node có con bị biến thành leaf |
| 2 | 3322–3342 | 16.9. Reader content dài |
| 3 | 3324–3342 | Long-document safeguards |
| 1 | 3343–3396 | 17. Những chức năng đã chủ động loại bỏ hoặc giảm ưu tiên |
| 3 | 3345–3358 | Dependency và scope firewall |
| 2 | 3359–3385 | 17.1. Không có |
| 2 | 3386–3396 | 17.2. Không làm quá sớm |
| 1 | 3397–3447 | 18. Các chức năng nền tảng từ tầm nhìn ban đầu |
| 3 | 3399–3447 | Trạng thái công nghệ của các chức năng chưa khóa UX |
| 1 | 3448–3610 | 19. Luồng sử dụng tiêu biểu |
| 3 | 3450–3458 | Quy tắc mô tả flow tích hợp |
| 2 | 3459–3491 | 19.1. Lập kế hoạch hôm nay |
| 3 | 3461–3491 | Command sequence kỹ thuật |
| 2 | 3492–3504 | 19.2. Gộp task cùng giờ |
| 3 | 3494–3504 | Group flow |
| 2 | 3505–3520 | 19.3. Đánh giá task |
| 3 | 3507–3520 | Evaluation flow |
| 2 | 3521–3534 | 19.4. Sửa task |
| 3 | 3523–3534 | Edit flow |
| 2 | 3535–3547 | 19.5. Xóa task |
| 3 | 3537–3547 | Delete/archive flow |
| 2 | 3548–3560 | 19.6. Xem lịch tháng |
| 3 | 3550–3560 | Calendar flow |
| 2 | 3561–3577 | 19.7. Duyệt Life System |
| 3 | 3563–3577 | Browse flow |
| 2 | 3578–3592 | 19.8. Chỉnh cây |
| 3 | 3580–3592 | Edit flow |
| 2 | 3593–3610 | 19.9. Chỉnh trang leaf |
| 3 | 3595–3610 | Studio flow |
| 1 | 3611–3733 | 20. Tiêu chí nghiệm thu UX cấp cao |
| 3 | 3613–3630 | Mapping acceptance → test evidence |
| 2 | 3631–3655 | 20.1. Task |
| 3 | 3633–3655 | Evidence bổ sung |
| 2 | 3656–3664 | 20.2. Analytics |
| 2 | 3665–3682 | 20.3. Life System Browse |
| 3 | 3667–3682 | Evidence bổ sung |
| 2 | 3683–3700 | 20.4. Life System Edit |
| 3 | 3685–3700 | Evidence bổ sung |
| 2 | 3701–3722 | 20.5. Anime Narrative Canvas |
| 3 | 3703–3722 | Evidence bổ sung |
| 2 | 3723–3733 | 20.6. Local-first |
| 1 | 3734–3799 | 21. Các điểm chưa chốt và cần để mở |
| 3 | 3736–3799 | Phân loại lại sau khi đã chọn công nghệ |
| 1 | 3800–3801 | PHẦN II — HỢP ĐỒNG XUYÊN SUỐT TOÀN SẢN PHẨM |
| 1 | 3802–3890 | 22. Kiến trúc hệ thống và cấu trúc mã nguồn |
| 2 | 3804–3834 | 22.1. Layering bắt buộc |
| 3 | 3826–3834 | Dependency direction |
| 2 | 3835–3843 | 22.2. Typed boundary |
| 2 | 3844–3861 | 22.3. Command registry frontend |
| 2 | 3862–3880 | 22.4. State taxonomy |
| 2 | 3881–3890 | 22.5. Undo/redo |
| 3 | 3883–3890 | Ba lớp history |
| 1 | 3891–3942 | 23. Design system, component primitives và visual precision |
| 2 | 3893–3900 | 23.1. Primitive stack |
| 2 | 3901–3911 | 23.2. Component taxonomy |
| 2 | 3912–3923 | 23.3. Typography |
| 2 | 3924–3932 | 23.4. Iconography |
| 2 | 3933–3942 | 23.5. Layout precision và DPI |
| 1 | 3943–4017 | 24. Search, filters, backlinks, Outline, Noteboard và Graph |
| 2 | 3945–3958 | 24.1. Search foundation |
| 2 | 3959–3975 | 24.2. Typed filter AST |
| 2 | 3976–3985 | 24.3. Backlinks và tags |
| 2 | 3986–3994 | 24.4. Outline |
| 2 | 3995–4005 | 24.5. Noteboard |
| 2 | 4006–4017 | 24.6. Graph |
| 1 | 4018–4085 | 25. Asset, attachment, import/export và backup |
| 2 | 4020–4033 | 25.1. Asset store |
| 2 | 4034–4042 | 25.2. Image pipeline |
| 2 | 4043–4057 | 25.3. Markdown import/export |
| 2 | 4058–4075 | 25.4. Portable export package |
| 2 | 4076–4085 | 25.5. Backup |
| 1 | 4086–4135 | 26. Performance engineering |
| 2 | 4088–4105 | 26.1. Budgets định hướng |
| 2 | 4106–4114 | 26.2. Instrumentation |
| 2 | 4115–4124 | 26.3. Virtualization policy |
| 2 | 4125–4135 | 26.4. Rendering rules |
| 1 | 4136–4180 | 27. Accessibility, input và internationalization |
| 2 | 4138–4149 | 27.1. Accessibility baseline |
| 2 | 4150–4163 | 27.2. Radial fan keyboard model |
| 2 | 4164–4172 | 27.3. Time wheel keyboard model |
| 2 | 4173–4180 | 27.4. Language/locale |
| 1 | 4181–4237 | 28. Security, privacy, logging và recovery |
| 2 | 4183–4192 | 28.1. Tauri capability model |
| 2 | 4193–4203 | 28.2. Input/content security |
| 2 | 4204–4227 | 28.3. Logging |
| 2 | 4228–4237 | 28.4. Crash/recovery |
| 1 | 4238–4296 | 29. Testing và Definition of Done |
| 2 | 4240–4264 | 29.1. Test pyramid |
| 3 | 4242–4248 | TypeScript/UI |
| 3 | 4249–4258 | Rust/SQLite |
| 3 | 4259–4264 | Desktop |
| 2 | 4265–4271 | 29.2. Visual regression |
| 2 | 4272–4280 | 29.3. Animation regression |
| 2 | 4281–4296 | 29.4. Definition of Done |
| 1 | 4297–4349 | 30. Build, installer, signing, updates và distribution |
| 2 | 4299–4306 | 30.1. Windows runtime |
| 2 | 4307–4315 | 30.2. Installer |
| 2 | 4316–4323 | 30.3. Code signing |
| 2 | 4324–4330 | 30.4. Update policy |
| 2 | 4331–4339 | 30.5. CI/release |
| 2 | 4340–4349 | 30.6. Dependency and supply-chain |
| 1 | 4350–4405 | 31. Lộ trình triển khai theo vertical slices |
| 2 | 4352–4361 | 31.1. Slice 0 — Foundation proof |
| 2 | 4362–4369 | 31.2. Slice 1 — Task core |
| 2 | 4370–4376 | 31.3. Slice 2 — Completion + Analytics foundation |
| 2 | 4377–4383 | 31.4. Slice 3 — Life Browse |
| 2 | 4384–4389 | 31.5. Slice 4 — Life Edit |
| 2 | 4390–4397 | 31.6. Slice 5 — Narrative Canvas |
| 2 | 4398–4405 | 31.7. Slice 6 — Polish and optional substrate activation |
| 1 | 4406–4441 | 32. Quy trình AI-assisted engineering |
| 2 | 4408–4414 | 32.1. Vai trò |
| 2 | 4415–4428 | 32.2. SDD-lite |
| 2 | 4429–4441 | 32.3. AI constitution tối thiểu |
| 1 | 4442–4477 | 33. Decision registry cô đọng |
| 2 | 4444–4456 | 33.1. LOCKED — Product |
| 2 | 4457–4460 | 33.2. LOCKED — Technology |
| 2 | 4461–4469 | 33.3. PROTOTYPE-GATED |
| 2 | 4470–4473 | 33.4. OPEN — Product/UX |
| 2 | 4474–4477 | 33.5. REMOVED |
| 1 | 4478–4594 | 34. Báo cáo rà soát 100 vòng |
| 2 | 4482–4584 | 34.1. Nhóm 100 kiểm tra |
| 2 | 4585–4594 | 34.2. Kết quả audit |
| 1 | 4595–4625 | 35. Nguồn kỹ thuật đã xác minh |
| 1 | 4626–4637 | 36. Kết luận điều hành |
