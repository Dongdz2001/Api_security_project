# Đề cương luận văn thạc sĩ bằng LaTeX

File chính:

```text
proposal/main.tex
```

Mẫu này được dựng theo file PDF **Hướng dẫn trình bày đề cương luận văn thạc sĩ 2017**:

- Khổ giấy A4.
- Font Times New Roman.
- Cỡ chữ 14pt.
- Giãn dòng 1.5.
- Lề trên 3cm, dưới 2cm, trái 3cm, phải 2cm.
- Thụt đầu dòng 1cm.
- Có bìa chính, bìa phụ, phần mở đầu, dự kiến chương mục, kế hoạch thực hiện và tài liệu tham khảo.

Nên biên dịch bằng XeLaTeX để hỗ trợ tiếng Việt và Times New Roman:

```bash
xelatex main.tex
xelatex main.tex
```

Trên Overleaf, nên vào **Menu -> Compiler** và chọn **XeLaTeX** để dùng đúng Times New Roman. File cũng đã có fallback cho `pdfLaTeX`, nên nếu Overleaf vẫn dùng compiler mặc định thì sẽ không còn lỗi `fontspec package requires either XeTeX or LuaTeX`.

Máy hiện tại chưa có bộ LaTeX (`xelatex`, `pdflatex`, `lualatex`), nên chưa render PDF trực tiếp tại đây.
