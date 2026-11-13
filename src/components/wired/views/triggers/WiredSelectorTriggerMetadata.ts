export type WiredSelectorTargetCategory = 'furni' | 'users';
export type WiredSelectorLogicalType = 'area' | 'neighborhood' | 'type' | 'on_furni';

export interface WiredSelectorTriggerField
{
    key: string;
    label: string;
    min?: number;
    defaultValue: number;
    options?: readonly { value: number; label: string }[];
}

export interface WiredSelectorTriggerMetadata
{
    code: string;
    logicalType: WiredSelectorLogicalType;
    title: string;
    description: string;
    targetCategory: WiredSelectorTargetCategory;
    fields: readonly WiredSelectorTriggerField[];
    requiresReference: boolean;
}

const areaFields: readonly WiredSelectorTriggerField[] = [
    { key: 'x', label: 'X', min: 0, defaultValue: 0 },
    { key: 'y', label: 'Y', min: 0, defaultValue: 0 },
    { key: 'width', label: 'Largura', min: 1, defaultValue: 1 },
    { key: 'height', label: 'Altura', min: 1, defaultValue: 1 }
];

const noFields: readonly WiredSelectorTriggerField[] = [];

export const WIRED_SELECTOR_USER_TYPE_OPTIONS = [
    { value: 0, label: 'Habbo' },
    { value: 1, label: 'Pet' },
    { value: 2, label: 'Bot' }
] as const;

const userTypeFields: readonly WiredSelectorTriggerField[] = [
    { key: 'userType', label: 'Tipo de usuário', defaultValue: 0, options: WIRED_SELECTOR_USER_TYPE_OPTIONS }
];

export const WIRED_SELECTOR_TRIGGER_METADATA: readonly WiredSelectorTriggerMetadata[] = [
    {
        code: 'wf_slc_furni_area',
        logicalType: 'area',
        title: 'Mobílias por área',
        description: 'Seleciona mobílias dentro do retângulo definido pelas coordenadas da sala.',
        targetCategory: 'furni',
        fields: areaFields,
        requiresReference: false
    },
    {
        code: 'wf_slc_furni_neighborhood',
        logicalType: 'neighborhood',
        title: 'Mobílias na vizinhança',
        description: 'Usa sempre um quadrado fixo 3×3, centrado na posição do Selector (distância de Chebyshev de 1 tile). Não há campo de raio.',
        targetCategory: 'furni',
        fields: noFields,
        requiresReference: false
    },
    {
        code: 'wf_slc_furni_type',
        logicalType: 'type',
        title: 'Tipo de mobília',
        description: 'Usa a única mobília de referência selecionada para identificar o tipo.',
        targetCategory: 'furni',
        fields: noFields,
        requiresReference: true
    },
    {
        code: 'wf_slc_furni_on_furni',
        logicalType: 'on_furni',
        title: 'Mobílias sobre mobília',
        description: 'Usa a única mobília de referência selecionada como base.',
        targetCategory: 'furni',
        fields: noFields,
        requiresReference: true
    },
    {
        code: 'wf_slc_users_area',
        logicalType: 'area',
        title: 'Usuários por área',
        description: 'Seleciona usuários dentro do retângulo definido pelas coordenadas da sala.',
        targetCategory: 'users',
        fields: areaFields,
        requiresReference: false
    },
    {
        code: 'wf_slc_users_neighborhood',
        logicalType: 'neighborhood',
        title: 'Usuários na vizinhança',
        description: 'Usa sempre um quadrado fixo 3×3, centrado na posição do Selector (distância de Chebyshev de 1 tile). Não há campo de raio.',
        targetCategory: 'users',
        fields: noFields,
        requiresReference: false
    },
    {
        code: 'wf_slc_users_type',
        logicalType: 'type',
        title: 'Tipo de usuário',
        description: 'Escolha o tipo alvo. O valor enviado é estável: 0 = Habbo, 1 = Pet, 2 = Bot.',
        targetCategory: 'users',
        fields: userTypeFields,
        requiresReference: false
    },
    {
        code: 'wf_slc_users_on_furni',
        logicalType: 'on_furni',
        title: 'Usuários sobre mobília',
        description: 'Usa a única mobília de referência selecionada como base.',
        targetCategory: 'users',
        fields: noFields,
        requiresReference: true
    }
];

export const getWiredSelectorTriggerMetadata = (code: string) => WIRED_SELECTOR_TRIGGER_METADATA.find(metadata => metadata.code === code) || null;
