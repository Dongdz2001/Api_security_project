# Bài nghiên cứu/luận văn nháp bằng LaTeX

File chính:

```text
research/main.tex
```

Nội dung bám theo đề tài:

```text
Phân tích và ngăn chặn các cuộc tấn công nhắm vào API trong kiến trúc Microservices
```

Các nhóm tài liệu đã được tích hợp:

- OWASP API Security Top 10 2023.
- NIST SP 800-204 về chiến lược bảo mật microservices.
- NIST SP 800-204A về Service Mesh.
- Kong Gateway security và secrets management.
- Istio security và security best practices.

Định dạng theo hướng dẫn trình bày đề cương/luận văn:

- A4.
- Times New Roman.
- Cỡ chữ 14pt.
- Giãn dòng 1.5.
- Lề trên 3cm, dưới 2cm, trái 3cm, phải 2cm.
- Thụt đầu dòng 1cm.

Biên dịch bằng XeLaTeX:

```bash
xelatex main.tex
xelatex main.tex
```

Trên Overleaf, nên vào **Menu -> Compiler** và chọn **XeLaTeX** để dùng đúng Times New Roman. File `main.tex` cũng đã có dòng:

```tex
% !TeX program = xelatex
```

File cũng đã có fallback cho `pdfLaTeX`, nên nếu Overleaf vẫn để compiler mặc định thì sẽ không còn lỗi `fontspec package requires either XeTeX or LuaTeX`. Tuy nhiên bản đúng font Times New Roman nhất vẫn là khi dùng **XeLaTeX**.

Máy hiện tại chưa có `xelatex/pdflatex/lualatex`, nên chưa xuất PDF trực tiếp tại đây.
