quick project to view manpages in the browser

when done, run bun run build to get static page with js and what not to serve the user

not done yet, hope I'll manage to finish it

System requirments: pandoc

System man pages:

```bash
ls /usr/share/man # ommiting the language specific directories
``` 
Output:
```bash
man0p man1 man1p man2 man2const man2type man3 man3attr man3const man3head man3p man3type man4 man5 man6 man7 man8 mann
```

The system man pages are compressed, and I'll decompress them using (example command):

```bash
zcat /usr/share/man/man1/ls.1.gz | pandoc -f man -t markdown > ls.md
```

Neovim doc files:

```bash
api.txt api-ui-events.txt autocmd.txt change.txt channel.txt cmdline.txt credits.txt deprecated.txt dev_arch.txt dev_style.txt dev_test.txt dev_theme.txt dev_tools.txt dev.txt dev_vimpatch.txt diagnostic.txt diff.txt digraph.txt editing.txt faq.txt filetype.txt fold.txt ft_ada.txt ft_hare.txt ft_ps1.txt ft_raku.txt ft_rust.txt ft_sql.txt gui.txt health.txt
helphelp.txt help.txt if_perl.txt if_pyth.txt if_ruby.txt indent.txt index.txt insert.txt intro.txt job_control.txt l10n-arabic.txt l10n-hebrew.txt l10n-russian.txt l10n-vietnamese.txt lsp.txt lua-bit.txt lua-guide.txt lua-plugin.txt luaref.txt lua.txt luvref.txt map.txt mbyte.txt message.txt mlang.txt motion.txt news-0.10.txt news-0.11.txt news-0.9.txt news.txt nvim.txt
options.txt pack.txt pattern.txt pi_gzip.txt pi_msgpack.txt pi_paren.txt pi_spec.txt pi_tar.txt pi_tutor.txt pi_zip.txt plugins.txt provider.txt quickfix.txt quickref.txt recover.txt remote_plugin.txt remote.txt repeat.txt rileft.txt scroll.txt sign.txt spell.txt starting.txt support.txt syntax.txt tabpage.txt tags tagsrch.txt terminal.txt tips.txt treesitter.txt
tui.txt uganda.txt undo.txt userfunc.txt usr_01.txt usr_02.txt usr_03.txt usr_04.txt usr_05.txt usr_06.txt usr_07.txt usr_08.txt usr_09.txt usr_10.txt usr_11.txt usr_12.txt usr_20.txt usr_21.txt usr_22.txt usr_23.txt usr_24.txt usr_25.txt usr_26.txt usr_27.txt usr_28.txt usr_29.txt usr_30.txt usr_31.txt usr_32.txt usr_40.txt usr_41.txt
usr_42.txt usr_43.txt usr_44.txt usr_45.txt usr_toc.txt various.txt vi_diff.txt vim_diff.txt vimeval.txt vimfn.txt visual.txt vvars.txt windows.txt 
```
