# Full source coverage matrix

Every heading in the immutable source appears below. This matrix prevents setup summaries from silently dropping a source section.

| ID | Level | Source lines | Heading | Operational handling |
|---:|---:|---:|---|---|
| S-001 | 1 | 1–11 | SIÊU ĐẶC TẢ TÍCH HỢP SẢN PHẨM – GIAO DIỆN – CÔNG NGHỆ | Source retained; inspect context before implementation |
| S-002 | 2 | 2–11 | Ứng dụng desktop Windows local-first: Task System + Life System | Core / Task |
| S-003 | 1 | 12–115 | 0. Quản trị tài liệu và phương pháp ra quyết định | Decision governance |
| S-004 | 2 | 15–28 | Quy ước trạng thái quyết định | Decision governance |
| S-005 | 2 | 29–41 | 0.1. Mười lượt trace độc lập đã thực hiện | Source retained; inspect context before implementation |
| S-006 | 2 | 42–61 | 0.2. Mô phỏng quyết định 10 × 1.000.000 vòng | Decision governance |
| S-007 | 2 | 62–71 | 0.3. Chính sách phiên bản | Source retained; inspect context before implementation |
| S-008 | 2 | 72–102 | 0.4. Stack chuẩn hợp nhất | Source retained; inspect context before implementation |
| S-009 | 2 | 103–115 | 0.5. Nguyên tắc chống “implementation lấn át sản phẩm” | Source retained; inspect context before implementation |
| S-010 | 1 | 116–119 | PHẦN I — ĐẶC TẢ TÍCH HỢP THEO KHU VỰC SẢN PHẨM | Source retained; inspect context before implementation |
| S-011 | 1 | 120–197 | 1. Tầm nhìn sản phẩm | Source retained; inspect context before implementation |
| S-012 | 3 | 122–158 | Hợp đồng kiến trúc đi kèm tầm nhìn | Cross-cutting contract |
| S-013 | 2 | 159–167 | 1.1. Định nghĩa ngắn gọn | Source retained; inspect context before implementation |
| S-014 | 2 | 168–188 | 1.2. Định hướng trải nghiệm | Source retained; inspect context before implementation |
| S-015 | 3 | 170–188 | Ma trận trải nghiệm → quyết định kỹ thuật | Decision governance |
| S-016 | 2 | 189–197 | 1.3. Tần suất sử dụng | Source retained; inspect context before implementation |
| S-017 | 1 | 198–368 | 2. Phạm vi và nguyên tắc bất biến | Source retained; inspect context before implementation |
| S-018 | 3 | 200–213 | Enforcement ở cấp repo | Source retained; inspect context before implementation |
| S-019 | 2 | 214–271 | 2.1. Nền tảng | Source retained; inspect context before implementation |
| S-020 | 3 | 216–228 | Nền tảng kỹ thuật đã khóa sau xác minh | Source retained; inspect context before implementation |
| S-021 | 3 | 229–249 | Ranh giới React – Rust | Source retained; inspect context before implementation |
| S-022 | 3 | 250–271 | IPC contract | Source retained; inspect context before implementation |
| S-023 | 2 | 272–304 | 2.2. Nguyên tắc local-first | Source retained; inspect context before implementation |
| S-024 | 3 | 274–286 | Local-first ở mức runtime | Source retained; inspect context before implementation |
| S-025 | 3 | 287–304 | Nguyên tắc durability | Source retained; inspect context before implementation |
| S-026 | 2 | 305–345 | 2.3. Nguyên tắc thiết kế | Source retained; inspect context before implementation |
| S-027 | 3 | 307–318 | Design system enforcement | Source retained; inspect context before implementation |
| S-028 | 3 | 319–345 | Các scale tối thiểu | Source retained; inspect context before implementation |
| S-029 | 2 | 346–368 | 2.4. Phạm vi của giai đoạn hiện tại | Source retained; inspect context before implementation |
| S-030 | 1 | 369–449 | 3. Hai trục sản phẩm cốt lõi | Source retained; inspect context before implementation |
| S-031 | 3 | 371–393 | Domain separation | Source retained; inspect context before implementation |
| S-032 | 2 | 394–407 | 3.1. Task System | Core / Task |
| S-033 | 2 | 408–435 | 3.2. Life System | Source retained; inspect context before implementation |
| S-034 | 2 | 436–449 | 3.3. Quan hệ giữa hai trục | Source retained; inspect context before implementation |
| S-035 | 1 | 450–571 | 4. Kiến trúc thông tin và điều hướng toàn ứng dụng | Cross-cutting contract |
| S-036 | 3 | 452–462 | App shell implementation contract | Source retained; inspect context before implementation |
| S-037 | 3 | 463–478 | Layer contract | Source retained; inspect context before implementation |
| S-038 | 2 | 479–512 | 4.1. Bố cục app shell | Source retained; inspect context before implementation |
| S-039 | 3 | 481–490 | Kích thước và responsiveness | Source retained; inspect context before implementation |
| S-040 | 3 | 491–512 | Scroll ownership | Source retained; inspect context before implementation |
| S-041 | 2 | 513–519 | 4.2. Màn hình mặc định | Source retained; inspect context before implementation |
| S-042 | 2 | 520–546 | 4.3. Sidebar | Source retained; inspect context before implementation |
| S-043 | 3 | 522–530 | Component và trạng thái | Source retained; inspect context before implementation |
| S-044 | 3 | 531–546 | Acceptance | Source retained; inspect context before implementation |
| S-045 | 2 | 547–562 | 4.4. Life System nhớ vị trí | Source retained; inspect context before implementation |
| S-046 | 3 | 549–562 | Persistence contract | Source retained; inspect context before implementation |
| S-047 | 2 | 563–571 | 4.5. Điều hướng Today và Calendar | Core / Task |
| S-048 | 1 | 572–1149 | 5. Hệ thống Task | Core / Task |
| S-049 | 3 | 574–599 | Kiến trúc feature Task | Core / Task |
| S-050 | 3 | 600–612 | Data flow một mutation | Source retained; inspect context before implementation |
| S-051 | 2 | 613–630 | 5.1. Task không phải card | Core / Task |
| S-052 | 3 | 615–630 | DOM và visual contract | Source retained; inspect context before implementation |
| S-053 | 2 | 631–656 | 5.2. Cấu trúc ngày | Source retained; inspect context before implementation |
| S-054 | 3 | 633–656 | Time domain contract | Source retained; inspect context before implementation |
| S-055 | 2 | 657–676 | 5.3. Timeline liên tục | Source retained; inspect context before implementation |
| S-056 | 3 | 659–676 | Layout implementation | Source retained; inspect context before implementation |
| S-057 | 2 | 677–761 | 5.4. Bố cục một hàng task | Core / Task |
| S-058 | 3 | 679–696 | Grid contract của TaskRow | Core / Task |
| S-059 | 3 | 697–712 | Render performance | Cross-cutting contract |
| S-060 | 3 | 713–727 | Cột trái — thời gian | Source retained; inspect context before implementation |
| S-061 | 4 | 715–727 | Typography và accessibility | OPEN/DEFERRED; no activation without approval |
| S-062 | 3 | 728–745 | Cột giữa — nội dung | Source retained; inspect context before implementation |
| S-063 | 4 | 730–745 | Content rendering | Source retained; inspect context before implementation |
| S-064 | 3 | 746–761 | Cột phải — đánh giá | Source retained; inspect context before implementation |
| S-065 | 4 | 748–761 | Assessment control | Source retained; inspect context before implementation |
| S-066 | 2 | 762–769 | 5.5. Đường phân cách | Source retained; inspect context before implementation |
| S-067 | 2 | 770–793 | 5.6. Single-click và double-click | Source retained; inspect context before implementation |
| S-068 | 3 | 772–780 | Interaction implementation | Source retained; inspect context before implementation |
| S-069 | 3 | 781–788 | Single-click | Source retained; inspect context before implementation |
| S-070 | 3 | 789–793 | Double-click | Source retained; inspect context before implementation |
| S-071 | 2 | 794–826 | 5.7. Tạo task | Core / Task |
| S-072 | 3 | 796–826 | FAB và create command | Source retained; inspect context before implementation |
| S-073 | 2 | 827–862 | 5.8. Popup tạo/chỉnh task | Core / Task |
| S-074 | 3 | 829–838 | Dialog technology | Source retained; inspect context before implementation |
| S-075 | 3 | 839–862 | Autosave policy | Source retained; inspect context before implementation |
| S-076 | 2 | 863–871 | 5.9. Hạn chế nhập tay | Source retained; inspect context before implementation |
| S-077 | 2 | 872–896 | 5.10. Bộ chọn giờ | Source retained; inspect context before implementation |
| S-078 | 3 | 874–883 | TimeWheel architecture | Source retained; inspect context before implementation |
| S-079 | 3 | 884–896 | Minute precision | Source retained; inspect context before implementation |
| S-080 | 2 | 897–918 | 5.11. Quy tắc khoảng thời gian hợp lệ | Source retained; inspect context before implementation |
| S-081 | 3 | 899–918 | Conflict engine | Source retained; inspect context before implementation |
| S-082 | 2 | 919–958 | 5.12. Group task cùng khung giờ | Core / Task |
| S-083 | 3 | 921–958 | Data và layout | Source retained; inspect context before implementation |
| S-084 | 2 | 959–989 | 5.13. Priority | Source retained; inspect context before implementation |
| S-085 | 3 | 961–989 | Visual token | Source retained; inspect context before implementation |
| S-086 | 2 | 990–1033 | 5.14. Category | Source retained; inspect context before implementation |
| S-087 | 3 | 992–1033 | Category architecture | Source retained; inspect context before implementation |
| S-088 | 2 | 1034–1071 | 5.15. Recurring | Source retained; inspect context before implementation |
| S-089 | 3 | 1036–1045 | Recurrence engine | Source retained; inspect context before implementation |
| S-090 | 3 | 1046–1051 | Ba phạm vi sửa | Source retained; inspect context before implementation |
| S-091 | 3 | 1052–1071 | Test bắt buộc | Source retained; inspect context before implementation |
| S-092 | 2 | 1072–1092 | 5.16. Reminder | Source retained; inspect context before implementation |
| S-093 | 3 | 1074–1092 | Enforcement trạng thái REMOVED | Source retained; inspect context before implementation |
| S-094 | 2 | 1093–1112 | 5.17. Task bỏ lỡ | Core / Task |
| S-095 | 3 | 1095–1112 | Missed state derivation | Source retained; inspect context before implementation |
| S-096 | 2 | 1113–1139 | 5.18. Đường thời gian hiện tại | Source retained; inspect context before implementation |
| S-097 | 3 | 1115–1139 | CurrentTimeIndicator | Source retained; inspect context before implementation |
| S-098 | 2 | 1140–1149 | 5.19. Không hiển thị điểm trên Task | Core / Task |
| S-099 | 1 | 1150–1281 | 6. Lịch tháng và điều hướng ngày | Core / Task |
| S-100 | 3 | 1152–1164 | Calendar architecture | Core / Task |
| S-101 | 2 | 1165–1191 | 6.1. Today week strip | Source retained; inspect context before implementation |
| S-102 | 3 | 1167–1191 | WeekStrip component | Source retained; inspect context before implementation |
| S-103 | 2 | 1192–1210 | 6.2. Calendar view | Core / Task |
| S-104 | 3 | 1194–1210 | Month view layout | Source retained; inspect context before implementation |
| S-105 | 2 | 1211–1271 | 6.3. Nội dung ô ngày | Source retained; inspect context before implementation |
| S-106 | 3 | 1213–1271 | Data projection và rendering | Source retained; inspect context before implementation |
| S-107 | 2 | 1272–1281 | 6.4. Trạng thái ngày | Source retained; inspect context before implementation |
| S-108 | 1 | 1282–1507 | 7. Đánh giá mức độ hoàn thành task | Core / Task |
| S-109 | 3 | 1284–1292 | Completion subsystem architecture | Core / Task |
| S-110 | 2 | 1293–1310 | 7.1. Bản chất | Source retained; inspect context before implementation |
| S-111 | 2 | 1311–1340 | 7.2. Bộ trạng thái mặc định | Source retained; inspect context before implementation |
| S-112 | 3 | 1313–1340 | Default seed và customization | Source retained; inspect context before implementation |
| S-113 | 2 | 1341–1358 | 7.3. Ánh xạ ngầm | Source retained; inspect context before implementation |
| S-114 | 3 | 1343–1358 | Scoring data contract | Source retained; inspect context before implementation |
| S-115 | 2 | 1359–1379 | 7.4. Vòng tròn đóng | Source retained; inspect context before implementation |
| S-116 | 3 | 1361–1379 | Trigger rendering | Source retained; inspect context before implementation |
| S-117 | 2 | 1380–1416 | 7.5. Bộ chọn hình quạt | Source retained; inspect context before implementation |
| S-118 | 3 | 1382–1393 | RadialFan technology | Source retained; inspect context before implementation |
| S-119 | 3 | 1394–1416 | Geometry contract | Source retained; inspect context before implementation |
| S-120 | 2 | 1417–1463 | 7.6. Xác suất dự đoán | Source retained; inspect context before implementation |
| S-121 | 3 | 1419–1463 | Prediction scope | Source retained; inspect context before implementation |
| S-122 | 2 | 1464–1487 | 7.7. Sau khi chọn | Source retained; inspect context before implementation |
| S-123 | 3 | 1466–1487 | Transaction sequence | Source retained; inspect context before implementation |
| S-124 | 2 | 1488–1507 | 7.8. Phân biệt trạng thái vận hành và đánh giá | Source retained; inspect context before implementation |
| S-125 | 3 | 1492–1498 | Trạng thái vận hành | Source retained; inspect context before implementation |
| S-126 | 3 | 1499–1507 | Đánh giá kết quả | Source retained; inspect context before implementation |
| S-127 | 1 | 1508–1766 | 8. Analytics, điểm số, thời lượng và streak | Core analytics (formula may remain OPEN) |
| S-128 | 3 | 1510–1518 | Analytics architecture | Core analytics (formula may remain OPEN) |
| S-129 | 3 | 1519–1533 | Aggregate strategy | Source retained; inspect context before implementation |
| S-130 | 2 | 1534–1547 | 8.1. Analytics là trang riêng | Core analytics (formula may remain OPEN) |
| S-131 | 2 | 1548–1566 | 8.2. Thứ tự ưu tiên trang tuần | Source retained; inspect context before implementation |
| S-132 | 3 | 1550–1566 | Layout contract | Source retained; inspect context before implementation |
| S-133 | 2 | 1567–1587 | 8.3. Điểm tổng hợp | Source retained; inspect context before implementation |
| S-134 | 3 | 1569–1587 | Score contract | Source retained; inspect context before implementation |
| S-135 | 2 | 1588–1615 | 8.4. Màu điểm | Source retained; inspect context before implementation |
| S-136 | 3 | 1590–1615 | Color implementation | Source retained; inspect context before implementation |
| S-137 | 2 | 1616–1663 | 8.5. Thuật toán điểm | Source retained; inspect context before implementation |
| S-138 | 3 | 1618–1663 | Engineering contract cho thuật toán chưa chốt | Source retained; inspect context before implementation |
| S-139 | 2 | 1664–1710 | 8.6. Thống kê thời gian theo category | Source retained; inspect context before implementation |
| S-140 | 3 | 1666–1710 | Duration semantics | Source retained; inspect context before implementation |
| S-141 | 2 | 1711–1746 | 8.7. Streak | Core analytics (formula may remain OPEN) |
| S-142 | 3 | 1713–1746 | Streak engine | Core analytics (formula may remain OPEN) |
| S-143 | 2 | 1747–1766 | 8.8. Tổng kết theo thời gian | Source retained; inspect context before implementation |
| S-144 | 1 | 1767–1940 | 9. Life System dạng cây card | Core / Life |
| S-145 | 3 | 1769–1779 | Life Browse architecture | Source retained; inspect context before implementation |
| S-146 | 3 | 1780–1784 | Performance | Cross-cutting contract |
| S-147 | 2 | 1785–1798 | 9.1. Mục đích | Source retained; inspect context before implementation |
| S-148 | 2 | 1799–1825 | 9.2. Browse Mode chỉ hiện hai tầng | Source retained; inspect context before implementation |
| S-149 | 3 | 1801–1825 | Layout contract | Source retained; inspect context before implementation |
| S-150 | 2 | 1826–1856 | 9.3. Chuyển xuống node con | Source retained; inspect context before implementation |
| S-151 | 3 | 1828–1856 | Transition choreography | OPEN/DEFERRED; no activation without approval |
| S-152 | 2 | 1857–1879 | 9.4. Card trung gian | Source retained; inspect context before implementation |
| S-153 | 3 | 1859–1879 | Card component | Source retained; inspect context before implementation |
| S-154 | 2 | 1880–1900 | 9.5. Leaf card | Source retained; inspect context before implementation |
| S-155 | 3 | 1882–1900 | Reader opening | Decision governance |
| S-156 | 2 | 1901–1920 | 9.6. Back và breadcrumb | Source retained; inspect context before implementation |
| S-157 | 2 | 1921–1940 | 9.7. Pinned | Source retained; inspect context before implementation |
| S-158 | 3 | 1923–1940 | Pinned projection | Source retained; inspect context before implementation |
| S-159 | 1 | 1941–2070 | 10. Life System Edit Mode | Core / Life |
| S-160 | 3 | 1943–1957 | Full-tree editor architecture | Source retained; inspect context before implementation |
| S-161 | 2 | 1958–1964 | 10.1. Chế độ riêng | Source retained; inspect context before implementation |
| S-162 | 2 | 1965–1994 | 10.2. Hiển thị toàn bộ cây | Source retained; inspect context before implementation |
| S-163 | 3 | 1967–1994 | Geometry pipeline | Source retained; inspect context before implementation |
| S-164 | 2 | 1995–2025 | 10.3. Chỉnh cấu trúc | Source retained; inspect context before implementation |
| S-165 | 3 | 1997–2025 | Command catalog | Source retained; inspect context before implementation |
| S-166 | 2 | 2026–2056 | 10.4. Drag reparent | Source retained; inspect context before implementation |
| S-167 | 3 | 2028–2038 | DnD interaction contract | Source retained; inspect context before implementation |
| S-168 | 3 | 2039–2056 | Cycle validation | Source retained; inspect context before implementation |
| S-169 | 2 | 2057–2070 | 10.5. Mức độ thu nhỏ | Source retained; inspect context before implementation |
| S-170 | 1 | 2071–2518 | 11. Anime Narrative Canvas | Expansion unless separately approved |
| S-171 | 3 | 2073–2084 | Canonical content architecture | Source retained; inspect context before implementation |
| S-172 | 3 | 2085–2089 | Vì sao JSON canonical | Source retained; inspect context before implementation |
| S-173 | 2 | 2090–2123 | 11.1. Định nghĩa | Source retained; inspect context before implementation |
| S-174 | 3 | 2092–2123 | Document boundaries | Source retained; inspect context before implementation |
| S-175 | 2 | 2124–2151 | 11.2. Định hướng thị giác | Source retained; inspect context before implementation |
| S-176 | 2 | 2152–2188 | 11.3. Cấu trúc scene | Expansion unless separately approved |
| S-177 | 3 | 2154–2188 | Scene runtime contract | Expansion unless separately approved |
| S-178 | 2 | 2189–2217 | 11.4. Preset bố cục scene | Expansion unless separately approved |
| S-179 | 3 | 2191–2217 | Layout engine | Source retained; inspect context before implementation |
| S-180 | 2 | 2218–2306 | 11.5. Loại block | Source retained; inspect context before implementation |
| S-181 | 3 | 2220–2239 | Block registry | Source retained; inspect context before implementation |
| S-182 | 3 | 2240–2260 | Nội dung cơ bản | Source retained; inspect context before implementation |
| S-183 | 4 | 2242–2260 | Implementation notes | Source retained; inspect context before implementation |
| S-184 | 3 | 2261–2281 | Dữ liệu có cấu trúc | Cross-cutting contract |
| S-185 | 4 | 2263–2281 | Structured blocks | Source retained; inspect context before implementation |
| S-186 | 3 | 2282–2306 | Hình ảnh và trang trí | Source retained; inspect context before implementation |
| S-187 | 4 | 2284–2306 | Asset/render policy | Cross-cutting contract |
| S-188 | 2 | 2307–2314 | 11.6. Không liên kết trực quan giữa leaf card | Source retained; inspect context before implementation |
| S-189 | 2 | 2315–2337 | 11.7. Read Mode | Expansion unless separately approved |
| S-190 | 3 | 2317–2337 | Read renderer và lazy scene | Expansion unless separately approved |
| S-191 | 2 | 2338–2373 | 11.8. Studio Mode | Expansion unless separately approved |
| S-192 | 3 | 2340–2373 | Studio shell | Expansion unless separately approved |
| S-193 | 2 | 2374–2394 | 11.9. Template-first | Expansion unless separately approved |
| S-194 | 3 | 2376–2394 | Template system | Expansion unless separately approved |
| S-195 | 2 | 2395–2518 | 11.10. Bảy template cốt lõi | Expansion unless separately approved |
| S-196 | 3 | 2397–2415 | 1. Domain Profile — Hồ sơ lĩnh vực | Source retained; inspect context before implementation |
| S-197 | 3 | 2416–2433 | 2. Roadmap — Lộ trình | Source retained; inspect context before implementation |
| S-198 | 3 | 2434–2449 | 3. Principles — Hệ nguyên tắc | Source retained; inspect context before implementation |
| S-199 | 3 | 2450–2466 | 4. Strategy Dashboard — Bảng chiến lược | Source retained; inspect context before implementation |
| S-200 | 3 | 2467–2482 | 5. Decision Studio — Ra quyết định | Expansion unless separately approved |
| S-201 | 3 | 2483–2500 | 6. Knowledge Dossier — Hồ sơ kiến thức | Source retained; inspect context before implementation |
| S-202 | 3 | 2501–2518 | 7. Personal Vision — Tầm nhìn cá nhân | Source retained; inspect context before implementation |
| S-203 | 1 | 2519–2699 | 12. Hệ thống theme Abstract Anime Editorial | Expansion unless separately approved |
| S-204 | 3 | 2521–2532 | Theme engine | Source retained; inspect context before implementation |
| S-205 | 3 | 2533–2545 | Token hierarchy | Source retained; inspect context before implementation |
| S-206 | 2 | 2546–2569 | 12.1. Theme theo branch | Source retained; inspect context before implementation |
| S-207 | 3 | 2548–2569 | Inheritance | Source retained; inspect context before implementation |
| S-208 | 2 | 2570–2643 | 12.2. Visual world mặc định | Source retained; inspect context before implementation |
| S-209 | 3 | 2572–2587 | Asset và performance contract cho visual worlds | Cross-cutting contract |
| S-210 | 3 | 2588–2593 | Life root — Celestial Nexus | Source retained; inspect context before implementation |
| S-211 | 3 | 2594–2603 | Học tập — Azure Observatory | Source retained; inspect context before implementation |
| S-212 | 3 | 2604–2613 | Sự nghiệp/Lab — Midnight Research Grid | OPEN/DEFERRED; no activation without approval |
| S-213 | 3 | 2614–2623 | Tài chính — Amber Vault | Source retained; inspect context before implementation |
| S-214 | 3 | 2624–2633 | Sức khỏe — Verdant Pulse | Source retained; inspect context before implementation |
| S-215 | 3 | 2634–2643 | Quan hệ/Tình yêu — Rose Nebula | Source retained; inspect context before implementation |
| S-216 | 2 | 2644–2660 | 12.3. Branch mới | Source retained; inspect context before implementation |
| S-217 | 3 | 2646–2660 | World library | Source retained; inspect context before implementation |
| S-218 | 2 | 2661–2699 | 12.4. Background liên tục | Source retained; inspect context before implementation |
| S-219 | 3 | 2663–2699 | Layer implementation | Source retained; inspect context before implementation |
| S-220 | 1 | 2700–2877 | 13. Motion, chuyển cảnh và phản hồi giao diện | Cross-cutting contract |
| S-221 | 3 | 2702–2712 | Motion system architecture | Cross-cutting contract |
| S-222 | 3 | 2713–2717 | Motion ownership | Cross-cutting contract |
| S-223 | 2 | 2718–2744 | 13.1. Mức motion | Cross-cutting contract |
| S-224 | 3 | 2720–2744 | Mapping Calm / Expressive / Cinematic | Source retained; inspect context before implementation |
| S-225 | 2 | 2745–2766 | 13.2. Page transition | Source retained; inspect context before implementation |
| S-226 | 3 | 2747–2766 | Shared-element constraints | Source retained; inspect context before implementation |
| S-227 | 2 | 2767–2797 | 13.3. Scene reveal | Expansion unless separately approved |
| S-228 | 3 | 2769–2797 | Reveal policy | Source retained; inspect context before implementation |
| S-229 | 2 | 2798–2822 | 13.4. Ambient motion | Cross-cutting contract |
| S-230 | 3 | 2800–2822 | Runtime budget | Source retained; inspect context before implementation |
| S-231 | 2 | 2823–2846 | 13.5. Timing | Source retained; inspect context before implementation |
| S-232 | 3 | 2825–2846 | Motion tokens | Cross-cutting contract |
| S-233 | 2 | 2847–2865 | 13.6. Reduced Motion | Cross-cutting contract |
| S-234 | 3 | 2849–2865 | Accessibility implementation | Cross-cutting contract |
| S-235 | 2 | 2866–2877 | 13.7. Âm thanh | Source retained; inspect context before implementation |
| S-236 | 1 | 2878–2993 | 14. Settings | Cross-cutting contract |
| S-237 | 3 | 2880–2890 | Settings architecture | Cross-cutting contract |
| S-238 | 2 | 2891–2912 | 14.1. Category Settings | Cross-cutting contract |
| S-239 | 3 | 2893–2912 | UI và command | Source retained; inspect context before implementation |
| S-240 | 2 | 2913–2932 | 14.2. Completion State Settings | Core / Task |
| S-241 | 3 | 2915–2932 | Radial configuration preview | Source retained; inspect context before implementation |
| S-242 | 2 | 2933–2943 | 14.3. Scoring Settings | Cross-cutting contract |
| S-243 | 2 | 2944–2964 | 14.4. Appearance | Source retained; inspect context before implementation |
| S-244 | 3 | 2946–2964 | Appearance storage | Source retained; inspect context before implementation |
| S-245 | 2 | 2965–2972 | 14.5. Life System | Source retained; inspect context before implementation |
| S-246 | 2 | 2973–2993 | 14.6. Backup | Cross-cutting contract |
| S-247 | 3 | 2975–2993 | Backup UI integration | Cross-cutting contract |
| S-248 | 1 | 2994–3224 | 15. Mô hình dữ liệu khái niệm | Cross-cutting contract |
| S-249 | 3 | 2996–3011 | Data architecture tổng thể | Source retained; inspect context before implementation |
| S-250 | 3 | 3012–3023 | Connection policy | Source retained; inspect context before implementation |
| S-251 | 2 | 3024–3067 | 15.1. Task | Core / Task |
| S-252 | 3 | 3026–3067 | Task relational contract dự kiến | Core / Task |
| S-253 | 2 | 3068–3087 | 15.2. Category | Source retained; inspect context before implementation |
| S-254 | 3 | 3070–3087 | Category storage | Source retained; inspect context before implementation |
| S-255 | 2 | 3088–3109 | 15.3. Completion State | Core / Task |
| S-256 | 3 | 3090–3109 | Completion schema | Core / Task |
| S-257 | 2 | 3110–3131 | 15.4. Recurrence Rule | Source retained; inspect context before implementation |
| S-258 | 3 | 3112–3131 | Recurrence tables | Source retained; inspect context before implementation |
| S-259 | 2 | 3132–3158 | 15.5. Life Node | Source retained; inspect context before implementation |
| S-260 | 3 | 3134–3158 | Tree storage | Source retained; inspect context before implementation |
| S-261 | 2 | 3159–3179 | 15.6. Reader Document | Source retained; inspect context before implementation |
| S-262 | 3 | 3161–3179 | Document persistence | Source retained; inspect context before implementation |
| S-263 | 2 | 3180–3198 | 15.7. Scene | Expansion unless separately approved |
| S-264 | 3 | 3182–3198 | Scene/block storage options | Expansion unless separately approved |
| S-265 | 2 | 3199–3224 | 15.8. Analytics Aggregate | Core analytics (formula may remain OPEN) |
| S-266 | 3 | 3201–3224 | Aggregate tables | Source retained; inspect context before implementation |
| S-267 | 1 | 3225–3342 | 16. Các hành vi biên và quy tắc nhất quán | Source retained; inspect context before implementation |
| S-268 | 3 | 3227–3239 | Command/transaction/undo framework | Source retained; inspect context before implementation |
| S-269 | 2 | 3240–3246 | 16.1. Task cùng khung giờ | Core / Task |
| S-270 | 2 | 3247–3253 | 16.2. Xung đột giờ | Source retained; inspect context before implementation |
| S-271 | 2 | 3254–3261 | 16.3. Task recurring bị chỉnh | Core / Task |
| S-272 | 2 | 3262–3269 | 16.4. Task chưa đánh giá khi hết ngày | Core / Task |
| S-273 | 2 | 3270–3283 | 16.5. Trạng thái completion bị xóa trong Settings | Core / Task |
| S-274 | 3 | 3272–3283 | Enforcement | Source retained; inspect context before implementation |
| S-275 | 2 | 3284–3295 | 16.6. Category bị xóa | Source retained; inspect context before implementation |
| S-276 | 3 | 3286–3295 | Enforcement | Source retained; inspect context before implementation |
| S-277 | 2 | 3296–3315 | 16.7. Đổi parent Life Node | Source retained; inspect context before implementation |
| S-278 | 3 | 3298–3315 | Reparent transaction | Source retained; inspect context before implementation |
| S-279 | 2 | 3316–3321 | 16.8. Node có con bị biến thành leaf | Source retained; inspect context before implementation |
| S-280 | 2 | 3322–3342 | 16.9. Reader content dài | Source retained; inspect context before implementation |
| S-281 | 3 | 3324–3342 | Long-document safeguards | Source retained; inspect context before implementation |
| S-282 | 1 | 3343–3396 | 17. Những chức năng đã chủ động loại bỏ hoặc giảm ưu tiên | Source retained; inspect context before implementation |
| S-283 | 3 | 3345–3358 | Dependency và scope firewall | Source retained; inspect context before implementation |
| S-284 | 2 | 3359–3385 | 17.1. Không có | Source retained; inspect context before implementation |
| S-285 | 2 | 3386–3396 | 17.2. Không làm quá sớm | Source retained; inspect context before implementation |
| S-286 | 1 | 3397–3447 | 18. Các chức năng nền tảng từ tầm nhìn ban đầu | Source retained; inspect context before implementation |
| S-287 | 3 | 3399–3447 | Trạng thái công nghệ của các chức năng chưa khóa UX | Source retained; inspect context before implementation |
| S-288 | 1 | 3448–3610 | 19. Luồng sử dụng tiêu biểu | Source retained; inspect context before implementation |
| S-289 | 3 | 3450–3458 | Quy tắc mô tả flow tích hợp | Source retained; inspect context before implementation |
| S-290 | 2 | 3459–3491 | 19.1. Lập kế hoạch hôm nay | Source retained; inspect context before implementation |
| S-291 | 3 | 3461–3491 | Command sequence kỹ thuật | Source retained; inspect context before implementation |
| S-292 | 2 | 3492–3504 | 19.2. Gộp task cùng giờ | Core / Task |
| S-293 | 3 | 3494–3504 | Group flow | Source retained; inspect context before implementation |
| S-294 | 2 | 3505–3520 | 19.3. Đánh giá task | Core / Task |
| S-295 | 3 | 3507–3520 | Evaluation flow | Source retained; inspect context before implementation |
| S-296 | 2 | 3521–3534 | 19.4. Sửa task | Core / Task |
| S-297 | 3 | 3523–3534 | Edit flow | Source retained; inspect context before implementation |
| S-298 | 2 | 3535–3547 | 19.5. Xóa task | Core / Task |
| S-299 | 3 | 3537–3547 | Delete/archive flow | Source retained; inspect context before implementation |
| S-300 | 2 | 3548–3560 | 19.6. Xem lịch tháng | Core / Task |
| S-301 | 3 | 3550–3560 | Calendar flow | Core / Task |
| S-302 | 2 | 3561–3577 | 19.7. Duyệt Life System | Core / Life |
| S-303 | 3 | 3563–3577 | Browse flow | Source retained; inspect context before implementation |
| S-304 | 2 | 3578–3592 | 19.8. Chỉnh cây | Core / Life |
| S-305 | 3 | 3580–3592 | Edit flow | Source retained; inspect context before implementation |
| S-306 | 2 | 3593–3610 | 19.9. Chỉnh trang leaf | Source retained; inspect context before implementation |
| S-307 | 3 | 3595–3610 | Studio flow | Expansion unless separately approved |
| S-308 | 1 | 3611–3733 | 20. Tiêu chí nghiệm thu UX cấp cao | Source retained; inspect context before implementation |
| S-309 | 3 | 3613–3630 | Mapping acceptance → test evidence | Source retained; inspect context before implementation |
| S-310 | 2 | 3631–3655 | 20.1. Task | Core / Task |
| S-311 | 3 | 3633–3655 | Evidence bổ sung | Source retained; inspect context before implementation |
| S-312 | 2 | 3656–3664 | 20.2. Analytics | Core analytics (formula may remain OPEN) |
| S-313 | 2 | 3665–3682 | 20.3. Life System Browse | Source retained; inspect context before implementation |
| S-314 | 3 | 3667–3682 | Evidence bổ sung | Source retained; inspect context before implementation |
| S-315 | 2 | 3683–3700 | 20.4. Life System Edit | Core / Life |
| S-316 | 3 | 3685–3700 | Evidence bổ sung | Source retained; inspect context before implementation |
| S-317 | 2 | 3701–3722 | 20.5. Anime Narrative Canvas | Expansion unless separately approved |
| S-318 | 3 | 3703–3722 | Evidence bổ sung | Source retained; inspect context before implementation |
| S-319 | 2 | 3723–3733 | 20.6. Local-first | Source retained; inspect context before implementation |
| S-320 | 1 | 3734–3799 | 21. Các điểm chưa chốt và cần để mở | Decision governance |
| S-321 | 3 | 3736–3799 | Phân loại lại sau khi đã chọn công nghệ | Source retained; inspect context before implementation |
| S-322 | 1 | 3800–3801 | PHẦN II — HỢP ĐỒNG XUYÊN SUỐT TOÀN SẢN PHẨM | Source retained; inspect context before implementation |
| S-323 | 1 | 3802–3890 | 22. Kiến trúc hệ thống và cấu trúc mã nguồn | Cross-cutting contract |
| S-324 | 2 | 3804–3834 | 22.1. Layering bắt buộc | Source retained; inspect context before implementation |
| S-325 | 3 | 3826–3834 | Dependency direction | Source retained; inspect context before implementation |
| S-326 | 2 | 3835–3843 | 22.2. Typed boundary | Source retained; inspect context before implementation |
| S-327 | 2 | 3844–3861 | 22.3. Command registry frontend | Source retained; inspect context before implementation |
| S-328 | 2 | 3862–3880 | 22.4. State taxonomy | Source retained; inspect context before implementation |
| S-329 | 2 | 3881–3890 | 22.5. Undo/redo | Source retained; inspect context before implementation |
| S-330 | 3 | 3883–3890 | Ba lớp history | Source retained; inspect context before implementation |
| S-331 | 1 | 3891–3942 | 23. Design system, component primitives và visual precision | Source retained; inspect context before implementation |
| S-332 | 2 | 3893–3900 | 23.1. Primitive stack | Source retained; inspect context before implementation |
| S-333 | 2 | 3901–3911 | 23.2. Component taxonomy | Source retained; inspect context before implementation |
| S-334 | 2 | 3912–3923 | 23.3. Typography | OPEN/DEFERRED; no activation without approval |
| S-335 | 2 | 3924–3932 | 23.4. Iconography | OPEN/DEFERRED; no activation without approval |
| S-336 | 2 | 3933–3942 | 23.5. Layout precision và DPI | Source retained; inspect context before implementation |
| S-337 | 1 | 3943–4017 | 24. Search, filters, backlinks, Outline, Noteboard và Graph | OPEN/DEFERRED; no activation without approval |
| S-338 | 2 | 3945–3958 | 24.1. Search foundation | OPEN/DEFERRED; no activation without approval |
| S-339 | 2 | 3959–3975 | 24.2. Typed filter AST | Source retained; inspect context before implementation |
| S-340 | 2 | 3976–3985 | 24.3. Backlinks và tags | OPEN/DEFERRED; no activation without approval |
| S-341 | 2 | 3986–3994 | 24.4. Outline | OPEN/DEFERRED; no activation without approval |
| S-342 | 2 | 3995–4005 | 24.5. Noteboard | OPEN/DEFERRED; no activation without approval |
| S-343 | 2 | 4006–4017 | 24.6. Graph | OPEN/DEFERRED; no activation without approval |
| S-344 | 1 | 4018–4085 | 25. Asset, attachment, import/export và backup | Cross-cutting contract |
| S-345 | 2 | 4020–4033 | 25.1. Asset store | Cross-cutting contract |
| S-346 | 2 | 4034–4042 | 25.2. Image pipeline | Source retained; inspect context before implementation |
| S-347 | 2 | 4043–4057 | 25.3. Markdown import/export | Source retained; inspect context before implementation |
| S-348 | 2 | 4058–4075 | 25.4. Portable export package | Source retained; inspect context before implementation |
| S-349 | 2 | 4076–4085 | 25.5. Backup | Cross-cutting contract |
| S-350 | 1 | 4086–4135 | 26. Performance engineering | Cross-cutting contract |
| S-351 | 2 | 4088–4105 | 26.1. Budgets định hướng | Source retained; inspect context before implementation |
| S-352 | 2 | 4106–4114 | 26.2. Instrumentation | Source retained; inspect context before implementation |
| S-353 | 2 | 4115–4124 | 26.3. Virtualization policy | Source retained; inspect context before implementation |
| S-354 | 2 | 4125–4135 | 26.4. Rendering rules | Source retained; inspect context before implementation |
| S-355 | 1 | 4136–4180 | 27. Accessibility, input và internationalization | Cross-cutting contract |
| S-356 | 2 | 4138–4149 | 27.1. Accessibility baseline | Cross-cutting contract |
| S-357 | 2 | 4150–4163 | 27.2. Radial fan keyboard model | Source retained; inspect context before implementation |
| S-358 | 2 | 4164–4172 | 27.3. Time wheel keyboard model | Source retained; inspect context before implementation |
| S-359 | 2 | 4173–4180 | 27.4. Language/locale | Source retained; inspect context before implementation |
| S-360 | 1 | 4181–4237 | 28. Security, privacy, logging và recovery | Cross-cutting contract |
| S-361 | 2 | 4183–4192 | 28.1. Tauri capability model | Source retained; inspect context before implementation |
| S-362 | 2 | 4193–4203 | 28.2. Input/content security | Cross-cutting contract |
| S-363 | 2 | 4204–4227 | 28.3. Logging | Source retained; inspect context before implementation |
| S-364 | 2 | 4228–4237 | 28.4. Crash/recovery | Source retained; inspect context before implementation |
| S-365 | 1 | 4238–4296 | 29. Testing và Definition of Done | Cross-cutting contract |
| S-366 | 2 | 4240–4264 | 29.1. Test pyramid | Source retained; inspect context before implementation |
| S-367 | 3 | 4242–4248 | TypeScript/UI | Source retained; inspect context before implementation |
| S-368 | 3 | 4249–4258 | Rust/SQLite | Source retained; inspect context before implementation |
| S-369 | 3 | 4259–4264 | Desktop | Source retained; inspect context before implementation |
| S-370 | 2 | 4265–4271 | 29.2. Visual regression | Source retained; inspect context before implementation |
| S-371 | 2 | 4272–4280 | 29.3. Animation regression | Source retained; inspect context before implementation |
| S-372 | 2 | 4281–4296 | 29.4. Definition of Done | Source retained; inspect context before implementation |
| S-373 | 1 | 4297–4349 | 30. Build, installer, signing, updates và distribution | Cross-cutting contract |
| S-374 | 2 | 4299–4306 | 30.1. Windows runtime | Source retained; inspect context before implementation |
| S-375 | 2 | 4307–4315 | 30.2. Installer | Source retained; inspect context before implementation |
| S-376 | 2 | 4316–4323 | 30.3. Code signing | Source retained; inspect context before implementation |
| S-377 | 2 | 4324–4330 | 30.4. Update policy | Source retained; inspect context before implementation |
| S-378 | 2 | 4331–4339 | 30.5. CI/release | Cross-cutting contract |
| S-379 | 2 | 4340–4349 | 30.6. Dependency and supply-chain | Source retained; inspect context before implementation |
| S-380 | 1 | 4350–4405 | 31. Lộ trình triển khai theo vertical slices | Source retained; inspect context before implementation |
| S-381 | 2 | 4352–4361 | 31.1. Slice 0 — Foundation proof | Source retained; inspect context before implementation |
| S-382 | 2 | 4362–4369 | 31.2. Slice 1 — Task core | Core / Task |
| S-383 | 2 | 4370–4376 | 31.3. Slice 2 — Completion + Analytics foundation | Core / Task |
| S-384 | 2 | 4377–4383 | 31.4. Slice 3 — Life Browse | Source retained; inspect context before implementation |
| S-385 | 2 | 4384–4389 | 31.5. Slice 4 — Life Edit | Source retained; inspect context before implementation |
| S-386 | 2 | 4390–4397 | 31.6. Slice 5 — Narrative Canvas | Source retained; inspect context before implementation |
| S-387 | 2 | 4398–4405 | 31.7. Slice 6 — Polish and optional substrate activation | Source retained; inspect context before implementation |
| S-388 | 1 | 4406–4441 | 32. Quy trình AI-assisted engineering | Source retained; inspect context before implementation |
| S-389 | 2 | 4408–4414 | 32.1. Vai trò | Source retained; inspect context before implementation |
| S-390 | 2 | 4415–4428 | 32.2. SDD-lite | Source retained; inspect context before implementation |
| S-391 | 2 | 4429–4441 | 32.3. AI constitution tối thiểu | Source retained; inspect context before implementation |
| S-392 | 1 | 4442–4477 | 33. Decision registry cô đọng | Source retained; inspect context before implementation |
| S-393 | 2 | 4444–4456 | 33.1. LOCKED — Product | Source retained; inspect context before implementation |
| S-394 | 2 | 4457–4460 | 33.2. LOCKED — Technology | Source retained; inspect context before implementation |
| S-395 | 2 | 4461–4469 | 33.3. PROTOTYPE-GATED | Source retained; inspect context before implementation |
| S-396 | 2 | 4470–4473 | 33.4. OPEN — Product/UX | Decision governance |
| S-397 | 2 | 4474–4477 | 33.5. REMOVED | Source retained; inspect context before implementation |
| S-398 | 1 | 4478–4594 | 34. Báo cáo rà soát 100 vòng | Source retained; inspect context before implementation |
| S-399 | 2 | 4482–4584 | 34.1. Nhóm 100 kiểm tra | Source retained; inspect context before implementation |
| S-400 | 2 | 4585–4594 | 34.2. Kết quả audit | Source retained; inspect context before implementation |
| S-401 | 1 | 4595–4625 | 35. Nguồn kỹ thuật đã xác minh | Source retained; inspect context before implementation |
| S-402 | 1 | 4626–4637 | 36. Kết luận điều hành | Source retained; inspect context before implementation |
