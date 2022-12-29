<script lang="ts">
import { connection, setupConnection, packageList, adbState, adbStateString} from './lib/adb.ts';
</script>

<h1>Teste</h1>

<p>Estado: {$adbStateString}</p>


<button on:click={setupConnection}>Testar</button>

{#await $packageList}
    <p>Carregando lista de apps</p>
{:then apps}
    {#if apps.length == 0}
        <p>Nenhum app encontrado (ainda)</p>
    {:else}
        {#each apps as app}
            <section style="margin-top: 1rem;">
                {#each Object.keys(app) as k}
                    <p style="margin: 0;"><b>{k}</b> = {app[k]}</p>
                {/each}
            </section>
        {/each}
    {/if}
{:catch error}
    <p style="color: red">{error.message || error}</p>
{/await}
