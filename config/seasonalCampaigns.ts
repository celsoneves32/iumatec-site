// Ativar campanhas apenas apos criar/verificar descontos reais no Shopify.
export type Campaign={id:string;enabled:boolean;start:string;end:string;title:string;href:string};
export const CAMPAIGNS:Campaign[]=[
{id:"halloween-2026",enabled:true,start:"2026-10-29",end:"2026-11-01",title:"Halloween bei IUMATEC – Technik entdecken",href:"/produkte"},
{id:"black-november-2026",enabled:true,start:"2026-11-02",end:"2026-11-30",title:"BLACK NOVEMBER bei IUMATEC - Technik entdecken",href:"/aktionen"},
{id:"weihnachten-2026",enabled:true,start:"2026-12-01",end:"2026-12-24",title:"Weihnachten bei IUMATEC – Geschenkideen entdecken",href:"/produkte"},
];
