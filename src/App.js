/* Copyright (c) 2020 vonKrafft <contact@vonkrafft.fr>
 * 
 * This file is part of VulnDB.
 * 
 * This file may be used under the terms of the GNU General Public License
 * version 3.0 as published by the Free Software Foundation and appearing in
 * the file LICENSE included in the packaging of this file. Please review the
 * following information to ensure the GNU General Public License version 3.0
 * requirements will be met: http://www.gnu.org/copyleft/gpl.html.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, Route, Redirect } from "react-router-dom";
import { Container, Message, Menu, Segment, Header, Grid, Icon, Loader, Input, 
  Dropdown, Dimmer, Button, Popup } from 'semantic-ui-react'
import './App.css';
import _ from 'lodash';

export default function App() {
  const renderTplHomePage = (props) => ( <TplHomePage {...props} /> );
  return (
    <React.Fragment>
      <Route path="/" exact render={() => <Redirect to="/home/FR" />} />
      <Route path="/home/:lang" render={renderTplHomePage} />
      <Route path="/search/:lang/:text" render={renderTplHomePage} />
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplHomePage
 *****************************************************************************/

class TplHomePage extends React.Component {
  state = {}

  constructor(props) {
    const { lang, uuid, text } = props.match.params;
    super(props);
    this.state = {
      loading: true,
      lang: lang || 'FR',
      uuid: uuid || null,
      search: text || '',
      data: [],
      total: 0,
      templates: []
    };
  }

  componentDidMount = () => {
    fetch('/api/templates')
      .then(response => { 
        if (response.status < 400) return response.json(); 
        else throw new Error(); 
      })
      .then(result => {
        const { lang, search, uuid } = this.state;
        this.setState({ 
          loading: false, 
          data: result.data, 
          total: result.data.length,  
          templates: this.filter(result.data, lang, search, uuid) 
        });
      })
      .catch(error => this.setState({ 
        loading: false, 
        error 
      }));
  }

  filter = (data, lang, search, uuid) => {
    return _.sortBy(_.filter(data, (o) => {
      if (!search) return o.language === lang;
      return o.language === lang && o.owasp !== o.title && (
        o.title.toUpperCase().match(search.toUpperCase()) || 
        o.description.toUpperCase().match(search.toUpperCase()) || 
        o.consequences.toUpperCase().match(search.toUpperCase()) || 
        o.recommendations.toUpperCase().match(search.toUpperCase()) 
      );
    }), [
      (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
      (o) => o.title
    ]);
  }

  handleSearchChange = (e, { name, value }) => {
    const { data, lang, search, uuid } = { ...this.state, [name]: value };
    this.setState({ loading: true });
    const templates = this.filter(data, lang, search, uuid);
    this.setState({ loading: false, templates: templates, [name]: value });
  }

  handleSearchClear = (e) => {
    const { data, lang, uuid } = this.state;
    this.setState({ loading: true });
    const templates = this.filter(data, lang, '', uuid);
    this.setState({ loading: false, templates: templates, search: '' });
  }

  handleSearchSave = (e) => {
    const { lang, search } = this.state;
    const path = search ? `/search/${lang}/${search}` : `/home/${lang}`
    this.props.history.push(path);
  }

  handleImportClick = (e) => {}
  handleSatisticsClick = (e) => {}
  handleAddClick = (e) => {}

  render = () => {
    const { loading, templates, total, search, lang } = this.state;

    const refs = _.reduce(templates, (refs, tpl) => {
      refs[tpl.uuid] = React.createRef();
      return refs;
    }, {});
    console.log('TplHomePage', refs);

    return (
      <React.Fragment>
        <TplNavbar 
          onImport={this.handleImportClick} 
          onSatistics={this.handleSatisticsClick} 
          onAdd={this.handleAddClick} 
        />
        <Container className='wrapper'>
          <Grid>
            <Grid.Column width={4}>
              <Dimmer active={loading} inverted></Dimmer>
              <TplSearchInput 
                search={search} 
                lang={lang} 
                onChange={this.handleSearchChange} 
                onClear={this.handleSearchClear} 
                onSave={this.handleSearchSave}
              />
              <TplSidebarMenu 
                templates={templates} 
                total={total} 
                refs={refs}
                key={`Sidebar-${lang}-${search}`}
              />
            </Grid.Column>
            <Grid.Column width={12} floated='right'>
              <Dimmer active={loading} inverted>
                <Loader />
              </Dimmer>
              <TplList 
                templates={templates} 
                refs={refs} 
                search={search} 
              />
            </Grid.Column>
          </Grid>
        </Container>
      </React.Fragment>
    );
  }
}

/*****************************************************************************
 * TplList
 *****************************************************************************/
 
const TplList = (props) => {
  const { templates, refs, search } = props;

  const TplListItem = ({ tpl, refs }) => (
    <div
      key={tpl.uuid} 
      ref={refs[tpl.uuid]} 
      class='ui mini segment' 
      aria-header={tpl.owasp === tpl.title}
    >
      <Header size='medium'>
        {tpl.title}
        <Header.Subheader>{tpl.owasp}</Header.Subheader>
      </Header>
      <TplListContent md={tpl.description} />
      <TplListContent md={tpl.consequences} />
      <TplListContent md={tpl.recommendations} />
    </div>
  );

  const TplListContent = ({ md }) => {
    md = md.replace(/\b(([A-Z])\2\2)\b/g, '**_$1_**');
    md = md.replace(new RegExp('(' + search + ')', 'i'), '_**$1**_');
    
    return (<ReactMarkdown source={md} className='paragraph' />);
  };

  return (
    <React.Fragment>
      { _.map(templates, (tpl) => (
        <TplListItem tpl={tpl} refs={refs} />
      )) }
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplNavbar
 *****************************************************************************/

const TplNavbar = (props) => {
  const { onImport, onSatistics, onAdd } = props;

  return (
    <Menu pointing secondary inverted size='huge' className='navbar'>
      <Container>
        <Menu.Item header>VulnDB</Menu.Item>
        <Menu.Menu icon position='right'>
          <Menu.Item href='/api/export' target='_blank'>
            <Icon name='download' />
          </Menu.Item>
          <Menu.Item onClick={onImport}>
            <Icon name='upload' />
          </Menu.Item>
          <Menu.Item onClick={onSatistics}>
            <Icon name='line graph' />
          </Menu.Item>
          <Menu.Item onClick={onAdd}>
            <Icon name='add square' />
          </Menu.Item>
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

/*****************************************************************************
 * TplSearchInput
 *****************************************************************************/

const TplSearchInput = (props) => {
  const { search, lang, onChange, onClear, onSave } = props;

  const options = [
    { key: 'FR', text: 'FR', value: 'FR' },
    { key: 'EN', text: 'EN', value: 'EN' },
  ];

  return (
    <Input 
      fluid 
      placeholder='Search...' 
      name='search'
      value={search}
      onChange={onChange}
      label={<Dropdown 
        basic 
        name='lang' 
        value={lang || 'FR'} 
        options={options} 
        onChange={onChange}
      />}
      labelPosition='left' 
      icon={<Icon 
        link 
        name='close' 
        disabled={!search} 
        onClick={onClear} 
      />} 
      action={<Popup
        trigger={<Button 
          basic 
          icon='save' 
          onClick={onSave} 
        />}
        size='mini' 
        content='Save the search to share it'
        position='bottom right'
      />} 
    />
  );
}

/*****************************************************************************
 * TplSidebarMenu
 *****************************************************************************/

const TplSidebarMenu = (props) => {
  const { templates, total, refs } = props;

  const sidebar =  _(templates).sortBy([
    (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
    (o) => o.title
  ]).reduce((menu, tpl) => {
    if (! menu[tpl.owasp]) {
      menu[tpl.owasp] = { 
        category: tpl.owasp, 
        templates: [] 
      };
    }
    if (tpl.owasp !== tpl.title) {
      menu[tpl.owasp].templates.push(tpl);
    }
    return menu;
  }, {});

  const handleClick = (uuid) => {
    const itemPositionTop = refs[uuid].current.offsetTop;
    return window.scrollTo({
      top: itemPositionTop - 14,
      behavior: 'smooth'
    });
  }

  return (
    <Menu vertical>
      <Menu.Item>
        <Message size='mini'>
          {templates.length} / {total} templates shown
        </Message>
      </Menu.Item>
      { _.map(sidebar || [], (menu) => (
        <Menu.Item>
          <Menu.Header>{menu.category}</Menu.Header>
          <Menu.Menu>
            { _.map(menu.templates, (tpl) => (
              <Menu.Item
                key={tpl.uuid}
                name={tpl.title}
                onClick={() => handleClick(tpl.uuid)}
              />
            )) }
          </Menu.Menu>
        </Menu.Item>
      )) }
    </Menu>
  );
}