fetch(
  "https://seller.shopee.co.id/api/v3/logistics/create_sd_jobs?SPC_CDS=cb209024-bd5a-42e4-86d3-23ec22c1b8d1&SPC_CDS_VER=2&async_sd_version=0.2",
  {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "id,en-US;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
      "content-type": "application/json;charset=UTF-8",
      pragma: "no-cache",
      priority: "u=1, i",
      "sc-fe-session": "05E182791D023BC2",
      "sc-fe-ver": "21.134031",
      "sec-ch-ua":
        '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie:
        "_QPWSDCXHZQA=6cbb1e0e-d43d-46a0-8083-8cf8570105b9; REC7iLP4Q=5b5ef9d4-898d-457f-8605-5333c8c321ff; SPC_F=ygp6xi9j7UOAzrT1G9K50uDP6KBPzyCz; REC_T_ID=4626cb95-57f6-11f0-9855-c634c0fe7032; SC_DFP=ZaZYjxBEQICmAICQqNnwnfDGmZJoNEcK; SPC_CLIENTID=eWdwNnhpOWo3VU9Boioxqwbimbxkwspu; SPC_SC_SA_TK=; SPC_SC_SA_UD=; csrftoken=Jjswe29ZBoewTFM0I3HuEPnIl3Wzty7q; SPC_CDS_CHAT=1fdb6d91-edde-47f5-845a-f08ebd0f86ee; SPC_CDS=cb209024-bd5a-42e4-86d3-23ec22c1b8d1; _sapid=5c5a39cb867086ae14aadbeaa7bf23fd39277333e603b2094252100c; _ga_8TJ45E514C=GS2.1.s1761805397$o1$g0$t1761805397$j60$l0$h0; web-seller-affiliate_language=id; MOCK_TYPE=; web-seller-affiliate-region=id; language=id; _gcl_gs=2.1.k1$i1763725866$u23706232; _gcl_aw=GCL.1763725961.CjwKCAiAuIDJBhBoEiwAxhgyFsIkv63raflNjjD4lnbnFrOJiXac496wCG2EJ2EFrE0P_Y0cwtHV7RoCdL0QAvD_BwE; _gac_UA-61904553-8=1.1763725961.CjwKCAiAuIDJBhBoEiwAxhgyFsIkv63raflNjjD4lnbnFrOJiXac496wCG2EJ2EFrE0P_Y0cwtHV7RoCdL0QAvD_BwE; _ga_PN56VNNPQX=GS2.3.s1763844628$o3$g1$t1763844843$j60$l0$h0; _ga_CGXK257VSB=GS2.1.s1763844628$o3$g1$t1763845069$j60$l0$h0; _gcl_au=1.1.1921941024.1767867615; _med=affiliates; _ga_3FHJ3W4FY1=GS2.1.s1768213590$o15$g1$t1768214209$j60$l0$h0; SPC_SI=RJhUaQAAAABIRjNlNlRRTeYabBEAAAAAU0ZNSERyTG8=; SPC_U=-; SPC_R_T_ID=W3bUC2fHXb+oTwQFhkq5QoIN1S/PBjTjWLhJUlq4eSU/Ngg1YjQCx0nZWGL99rnbD+Ae5+8wjMtiPUl8cKp/+vb52o7u7Amlje/2x09JkBFG6tLxlpEDjXyjrnuanDL/KVfseaVe5DRoaLSLFMe4WS24pja3ffzcJx8LDLx6lw4=; SPC_R_T_IV=VVlGT1N4QWVmaHhFT0swZg==; SPC_T_ID=W3bUC2fHXb+oTwQFhkq5QoIN1S/PBjTjWLhJUlq4eSU/Ngg1YjQCx0nZWGL99rnbD+Ae5+8wjMtiPUl8cKp/+vb52o7u7Amlje/2x09JkBFG6tLxlpEDjXyjrnuanDL/KVfseaVe5DRoaLSLFMe4WS24pja3ffzcJx8LDLx6lw4=; SPC_T_IV=VVlGT1N4QWVmaHhFT0swZg==; _ga_SW6D8G0HXK=GS2.1.s1768485621$o84$g1$t1768485624$j57$l0$h1003714713; SPC_SC_MAIN_SHOP_SA_UD=; SC_SSO_U=3133584; SPC_SC_SESSION=gKynSRNWQGwPfu+KEn0nxEtpqoS4ARwTqTZxkSnpADDUJs+p9fW0WjNYtIW1mwGBWvwWmnQGbCjd1b36DEnX8YIxC2a4HJ+OAuWCd3170v1JiZXt1FfCaPqK3Mw4E6Yi9Vyq3J1duWl0aVaXt5NMAj/nNYIWiFGx7HaZ+wqDc1aFq8TsklSvQyFJGJvaAyZ7a0SrS66jLBYZ+fnFDR1tul9Wc9scJqXSI9mvQtwn+FZLWbWS9ZrGo7mtjNWfHk8xZP2+Wz5KTAiKQJVKupTiXUNWhNGfaA9GEh2pdo8OJzat3ZJkgDSEV7gTD2uzTokkUVtKRioyEhuOBowSDo6xEtBtFxIk22fAwrP9izzugoG42xpqre700TxYsbCKe9V9khjCHTUgySM97K8ZU9KDdcVwYswTMFP3bMj/NSC+bbiFIT8ahhr37XlAOecsrmo28_2_3133584; SC_SSO=BZ02y6ruFPXKP2AgzVCcKAPW0w+SXKaheaWWulJR9paTrolISO/CHA9QxT/ifHhp; SPC_SC_OFFLINE_TOKEN=eyJkYXRhIjoiT25BNU1lMitTeFdxK1c0ZjRxQUp3ZGVZKzRxcVdEM2ZNZlBUa3ZraW84aDg0ZHF2RnBUNzBLUFlrRXIvU0p0NHFUc1dYV3R1QkJGOGhPT0dHSjJ6Ujh3S1lQd1dLTTM0bEJiTEtYdkRMRDNIV3QwSEN0RHovR0ZFSE1GSUQ5YjVJeWVYNHJkUGtRMUN2L1BzZXBrcS94RFNCOHAwTDJDTzlSeUtZOXhhdVFCY2thcDZEc01TSWptSko0Z3VuY1hzWEcxcDlqdWk5NUthaXRuYlVseDFkdz09IiwiaXYiOiJyVHBjL3QwUjYzRjBwdDI4T2EwYWpBPT0iLCJzaWduIjoiV1lya3YrTVhQdkErU0gzaG5vSmtzcUY4alpOanhwYmpzWjVheDNFVFJPT0l3c1N2bTNBcXY3WCs4aldvQVBvWllOWjJZaDBLT0Zkd0tpWEJ2NWdxQXc9PSJ9; SPC_STK=-; fulfillment-language=id; SPC_SI=RJhUaQAAAABIRjNlNlRRTeYabBEAAAAAU0ZNSERyTG8=; SPC_SEC_SI=v1-TjZiTXMzbE5EaUtycXdiQkfI2u/2Lfb83u+8lizofVsKeJpIVl1Owpyvw0nciEGlP7CXo2/PMpzmhepih9f4A7IDZWkGpB7dLy0ufAB+fes=; CTOKEN=nCzyO%2FbaEfC7s1qS3Ex%2BPQ%3D%3D; shopee_webUnique_ccd=6n8TOapebHxOewP9Ax%2BGAg%3D%3D%7CUEyhVtMxtPz9hUhc5yVM7CvbZqofLOTf%2FkUvCOPeerBq%2FVa%2B%2BwdkiRZgLOqD52mIvgIXrGtTrX8RoA%3D%3D%7CRGTL3C5BPzYvptZp%7C08%7C3; ds=aec2a2e0384488d24960014b9a7df549; _med=refer; _ga_QMX630BLLS=GS2.1.s1769009058$o37$g0$t1769009058$j60$l0$h0; _ga=GA1.3.1945337379.1751537571; _gid=GA1.3.100971603.1769009059",
      Referer:
        "https://seller.shopee.co.id/portal/sale/order?type=toship&source=processed&sort_by=confirmed_date_asc",
    },
    body: '{"group_list":[{"primary_package_number":"OFG222685295207109","group_shipment_id":0,"package_list":[{"order_id":222685295288645,"package_number":"OFG222685295207109"}]}],"region_id":"ID","shop_id":788348040,"channel_id":80033,"generate_file_details":[{"file_type":"THERMAL_PDF","file_name":"Label Pengiriman","file_contents":[3]}],"record_generate_schema":false}',
    method: "POST",
  },
);
